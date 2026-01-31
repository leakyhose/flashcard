import type { Socket, Server } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@shared/types.js";

import {
  createLobby,
  getLobbyByCode,
  addPlayerToLobby,
  removePlayerFromLobby,
  updateLeader,
  sortPlayersByMetric,
} from "../lobbyManager.js";

import { getCurrentQuestion, endGame, removeCurrentCardFromDeck } from "../gameManager.js";
import { filterFlashcardsForBroadcast } from "../utils/flashcardFilter.js";
import { clearLobbyTimers } from "../game/timerManager.js";

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedIO = Server<ClientToServerEvents, ServerToClientEvents>;

interface ActiveRound {
  endRound: () => void;
  roundStartTime: number;
  roundEnded: boolean;
}

export function registerLobbyHandlers(
  socket: TypedSocket,
  io: TypedIO,
  activeRounds: Map<string, ActiveRound>
): void {
  socket.on("createLobby", (nickname) => {
    const lobby = createLobby(socket.id, nickname);
    socket.join(lobby.code);
    socket.emit("lobbyUpdated", lobby);
  });

  socket.on("joinLobby", (code, nickname) => {
    const lobby = addPlayerToLobby(code, socket.id, nickname);
    if (!lobby) {
      console.log(`Failed to join lobby ${code}: lobby not found`);
      return;
    }
    socket.join(code);
    lobby.players = sortPlayersByMetric(lobby);

    const flashcardsForClient = filterFlashcardsForBroadcast(
      lobby.flashcards,
      lobby.allowView
    );

    if (lobby.allowView === false) {
      socket.emit("lobbyUpdated", {
        ...lobby,
        flashcards: flashcardsForClient,
      });
    } else {
      socket.emit("lobbyUpdated", lobby);
    }
    socket.to(code).emit("playersUpdated", lobby.players);
    io.to(code).emit("chatMessage", {
      player: "System",
      id: "system",
      text: `${nickname} joined the lobby`,
    });

    if (lobby.status === "ongoing") {
      const questionData = getCurrentQuestion(code);
      if (questionData) {
        socket.emit(
          "newFlashcard",
          questionData.question,
          questionData.choices,
          questionData.cardsPlayed
        );
      } else {
        socket.emit("startCountdown", "Waiting for current round to end");
      }
    }
  });

  socket.on("updateLeader", (nextLeaderId) => {
    const lobby = updateLeader(nextLeaderId);
    if (!lobby) {
      console.log(`Failed to update leader`);
      return;
    }
    io.to(lobby.code).emit("leaderUpdated", lobby.leader);
  });

  socket.on("getLobby", (code) => {
    const lobby = getLobbyByCode(code);
    if (!lobby) {
      socket.emit("lobbyData", null);
      return;
    }

    const flashcardsForClient = filterFlashcardsForBroadcast(
      lobby.flashcards,
      lobby.allowView
    );

    if (lobby.allowView === false) {
      socket.emit("lobbyData", {
        ...lobby,
        flashcards: flashcardsForClient,
      });
    } else {
      socket.emit("lobbyData", lobby);
    }
  });
}

export function handleDisconnect(
  socket: TypedSocket,
  io: TypedIO,
  activeRounds: Map<string, ActiveRound>,
  getLobbyBySocket: (socketId: string) => ReturnType<typeof getLobbyByCode>
): void {
  const lobbyBeforeRemoval = getLobbyBySocket(socket.id);
  const playerName = lobbyBeforeRemoval?.players.find(
    (p) => p.id === socket.id
  )?.name;
  const lobby = removePlayerFromLobby(socket.id);

  if (!lobby) {
    return;
  }

  if (lobby.endGameVotes) {
    lobby.endGameVotes = lobby.endGameVotes.filter((id) => id !== socket.id);
  }

  if (lobby?.leader === socket.id) {
    if (lobby.players.length > 0) {
      if (!lobby.players[0]) {
        console.log("No players found when updating leader on disconnect");
        return;
      }
      lobby.leader = lobby.players[0].id;
    }
  }
  if (!lobby) return;
  lobby.players = sortPlayersByMetric(lobby);
  io.to(lobby.code).emit("playersUpdated", lobby.players);
  io.to(lobby.code).emit("leaderUpdated", lobby.leader);

  if (lobby.status === "ongoing") {
    const totalPlayers = lobby.players.length;
    const votes = lobby.endGameVotes?.length || 0;

    if (totalPlayers > 0 && votes / totalPlayers > 0.75) {
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
      io.to(lobby.code).emit("endGameVotesUpdated", lobby.endGameVotes || []);
    }
  } else {
    io.to(lobby.code).emit("endGameVotesUpdated", lobby.endGameVotes || []);
  }

  if (playerName) {
    io.to(lobby.code).emit("chatMessage", {
      player: "System",
      id: "system",
      text: `${playerName} left the lobby`,
    });
  }
}
