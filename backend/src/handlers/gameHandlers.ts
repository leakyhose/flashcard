import type { Socket, Server } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@shared/types.js";

import {
  getLobbyBySocket,
  getLobbyByCode,
  sortPlayersByMetric,
} from "../lobbyManager.js";

import {
  startGame,
  validateAnswer,
  endGame,
  allPlayersAnsweredCorrectly,
  removeCurrentCardFromDeck,
} from "../gameManager.js";

import { loadMCOptionsFromSupabase } from "../supabaseClient.js";
import { setLobbyTimeout, clearLobbyTimers } from "../game/timerManager.js";
import { runGameplayLoop } from "../game/gameLoop.js";

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedIO = Server<ClientToServerEvents, ServerToClientEvents>;

interface ActiveRound {
  endRound: () => void;
  roundStartTime: number;
  roundEnded: boolean;
}

export function registerGameHandlers(
  socket: TypedSocket,
  io: TypedIO,
  activeRounds: Map<string, ActiveRound>
): void {
  socket.on("startGame", async () => {
    const lobby = startGame(socket.id);
    if (!lobby) {
      console.log("Failed to start game: lobby not found");
      return;
    }

    lobby.endGameVotes = [];

    lobby.status = "starting";
    lobby.players = sortPlayersByMetric(lobby);
    io.to(lobby.code).emit("lobbyStatusUpdated", "starting");
    io.to(lobby.code).emit("playersUpdated", lobby.players);
    io.to(lobby.code).emit("endGameVotesUpdated", []);

    const needsMCOptions =
      lobby.settings.multipleChoice &&
      lobby.flashcardID &&
      lobby.flashcards.length > 0 &&
      lobby.flashcards.some(
        (f) =>
          (f.termGenerated || f.definitionGenerated) &&
          !f.trickTerms?.length &&
          !f.trickDefinitions?.length
      );

    if (needsMCOptions) {
      console.log(
        `[startGame] Lazy-loading MC options for ${lobby.flashcardID}...`
      );
      io.to(lobby.code).emit("startCountdown", "Loading MC options...");

      const mcOptions = await loadMCOptionsFromSupabase(lobby.flashcardID);
      if (mcOptions) {
        for (const flashcard of lobby.flashcards) {
          const idx = parseInt(flashcard.id);
          const options = mcOptions.get(idx);
          if (options) {
            flashcard.trickTerms = options.trickTerms;
            flashcard.trickDefinitions = options.trickDefinitions;
          }
        }
        console.log(
          `[startGame] MC options loaded for ${mcOptions.size} cards`
        );
      }
    }

    let countdown = 3;
    io.to(lobby.code).emit("startCountdown", countdown);
    countdown--;

    const countdownInterval = setInterval(() => {
      if (countdown > 0) {
        io.to(lobby.code).emit("startCountdown", countdown);
        countdown--;
      } else {
        clearInterval(countdownInterval);

        lobby.status = "ongoing";
        lobby.players = sortPlayersByMetric(lobby);
        io.to(lobby.code).emit("lobbyStatusUpdated", "ongoing");
        io.to(lobby.code).emit("playersUpdated", lobby.players);

        runGameplayLoop(lobby.code, io, activeRounds);
      }
    }, 1000);
  });

  socket.on("answer", (text) => {
    const lobby = getLobbyBySocket(socket.id);
    if (!lobby) return;

    const roundInfo = activeRounds.get(lobby.code);
    if (roundInfo && roundInfo.roundEnded) {
      return;
    }

    const result = validateAnswer(socket.id, text);
    if (!result) return;

    if (result.isCorrect || result.lobby.settings.multipleChoice) {
      socket.emit("endGuess", result.timeTaken, result.isCorrect);
    }

    const player = result.lobby.players.find((p) => p.id === socket.id);
    if (player) {
      if (!player.totalAnswers) player.totalAnswers = 0;
      if (!player.correctAnswers) player.correctAnswers = 0;

      player.totalAnswers++;
      if (result.isCorrect) {
        player.correctAnswers++;
        if (!player.answerTimes) player.answerTimes = [];
        player.answerTimes.push(result.timeTaken);
      }
    }

    result.lobby.players = sortPlayersByMetric(result.lobby);
    io.to(result.lobby.code).emit("playersUpdated", result.lobby.players);

    const pointsToWin = result.lobby.settings.pointsToWin || 100;
    const someoneWon = result.lobby.players.some((p) => p.score >= pointsToWin);

    if (
      roundInfo &&
      !roundInfo.roundEnded &&
      (allPlayersAnsweredCorrectly(result.lobby.code) || someoneWon)
    ) {
      const elapsedTime = Date.now() - roundInfo.roundStartTime;
      const ROUND_DURATION = (result.lobby.settings.roundTime || 10) * 1000;
      const MIN_DELAY_AFTER_ALL_ANSWERED = 1000;
      const timeUntilEnd = ROUND_DURATION - elapsedTime;
      const delay = someoneWon
        ? 500
        : Math.min(timeUntilEnd, MIN_DELAY_AFTER_ALL_ANSWERED);

      setLobbyTimeout(result.lobby.code, () => roundInfo.endRound(), delay);
    }
  });

  socket.on("voteEndGame", () => {
    const lobby = getLobbyBySocket(socket.id);
    if (!lobby) return;

    if (lobby.status !== "ongoing") return;

    if (!lobby.endGameVotes) lobby.endGameVotes = [];

    if (!lobby.endGameVotes.includes(socket.id)) {
      lobby.endGameVotes.push(socket.id);

      const totalPlayers = lobby.players.length;
      const votes = lobby.endGameVotes.length;

      if (votes / totalPlayers > 0.75) {
        lobby.status = "finished";
        if (lobby.players[0]) {
          lobby.players[0].wins += 1;
        }
        lobby.players = sortPlayersByMetric(lobby);

        const activeRound = activeRounds.get(lobby.code);
        if (activeRound) {
          activeRound.roundEnded = true;
          activeRounds.delete(lobby.code);
        }

        clearLobbyTimers(lobby.code);

        io.to(lobby.code).emit("lobbyStatusUpdated", "finished");
        io.to(lobby.code).emit("playersUpdated", lobby.players);
        removeCurrentCardFromDeck(lobby.code);
        endGame(lobby.code);
      } else {
        io.to(lobby.code).emit("endGameVotesUpdated", lobby.endGameVotes);
      }
    }
  });

  socket.on("continueGame", () => {
    const lobby = getLobbyBySocket(socket.id);
    if (!lobby) {
      console.log("Failed to continue game: lobby not found");
      return;
    }

    if (lobby.leader !== socket.id) {
      console.log("Only leader can continue the game");
      return;
    }

    lobby.status = "waiting";
    lobby.players = sortPlayersByMetric(lobby);

    lobby.players.forEach((player) => {
      player.score = 0;
    });

    lobby.players = sortPlayersByMetric(lobby);
    io.to(lobby.code).emit("lobbyStatusUpdated", "waiting");
    io.to(lobby.code).emit("playersUpdated", lobby.players);
  });
}
