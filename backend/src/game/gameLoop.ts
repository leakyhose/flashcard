import type { Server } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@shared/types.js";

import { getLobbyByCode, wipeMiniStatus, sortPlayersByMetric } from "../lobbyManager.js";
import {
  setRoundStart,
  getCurrentQuestion,
  getRoundResults,
  advanceToNextFlashcard,
  endGame,
  processUnansweredPlayers,
} from "../gameManager.js";
import { setLobbyTimeout } from "./timerManager.js";

type TypedIO = Server<ClientToServerEvents, ServerToClientEvents>;

interface ActiveRound {
  endRound: () => void;
  roundStartTime: number;
  roundEnded: boolean;
}

export function runGameplayLoop(
  lobbyCode: string,
  io: TypedIO,
  activeRounds: Map<string, ActiveRound>
): void {
  const currentLobby = getLobbyByCode(lobbyCode);
  if (!currentLobby) return;

  const questionData = getCurrentQuestion(lobbyCode);
  if (!questionData) {
    const finalLobby = getLobbyByCode(lobbyCode);
    if (finalLobby) {
      finalLobby.status = "finished";
      if (finalLobby.players[0]) {
        finalLobby.players[0].wins += 1;
      }
      finalLobby.players = sortPlayersByMetric(finalLobby);
      io.to(lobbyCode).emit("lobbyStatusUpdated", "finished");
      io.to(lobbyCode).emit("playersUpdated", finalLobby.players);
      endGame(lobbyCode);
    }
    return;
  }

  setRoundStart(lobbyCode);
  io.to(lobbyCode).emit(
    "newFlashcard",
    questionData.question,
    questionData.choices,
    questionData.cardsPlayed
  );

  const roundStartTime = Date.now();
  const ROUND_DURATION = (currentLobby.settings.roundTime || 10) * 1000;
  let roundEnded = false;

  const endRound = () => {
    if (roundEnded) return;
    roundEnded = true;
    activeRounds.delete(lobbyCode);

    processUnansweredPlayers(lobbyCode);

    const results = getRoundResults(lobbyCode);
    if (results) {
      io.to(lobbyCode).emit("endFlashcard", results);
    }

    const lobby = wipeMiniStatus(lobbyCode);
    if (lobby) io.to(lobbyCode).emit("playersUpdated", lobby.players);

    setLobbyTimeout(
      lobbyCode,
      () => {
        const currentLobby = getLobbyByCode(lobbyCode);
        const pointsToWin = currentLobby?.settings.pointsToWin || 100;
        const winner = currentLobby?.players.find((p) => p.score >= pointsToWin);

        if (winner) {
          const finalLobby = getLobbyByCode(lobbyCode);
          if (finalLobby) {
            finalLobby.status = "finished";
            if (finalLobby.players[0]) {
              finalLobby.players[0].wins += 1;
            }
            finalLobby.players = sortPlayersByMetric(finalLobby);
            io.to(lobbyCode).emit("lobbyStatusUpdated", "finished");
            io.to(lobbyCode).emit("playersUpdated", finalLobby.players);
            endGame(lobbyCode);
          }
          return;
        }

        const nextQuestionData = advanceToNextFlashcard(lobbyCode);

        if (nextQuestionData) {
          runGameplayLoop(lobbyCode, io, activeRounds);
        } else {
          const finalLobby = getLobbyByCode(lobbyCode);
          if (finalLobby) {
            finalLobby.status = "finished";
            if (finalLobby.players[0]) {
              finalLobby.players[0].wins += 1;
            }
            finalLobby.players = sortPlayersByMetric(finalLobby);
            io.to(lobbyCode).emit("lobbyStatusUpdated", "finished");
            io.to(lobbyCode).emit("playersUpdated", finalLobby.players);
            endGame(lobbyCode);
          }
          return;
        }
      },
      3000
    );
  };

  activeRounds.set(lobbyCode, { endRound, roundStartTime, roundEnded });

  setLobbyTimeout(
    lobbyCode,
    () => {
      endRound();
    },
    ROUND_DURATION
  );
}
