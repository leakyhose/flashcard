import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  Lobby,
} from "@shared/types.js";

import {
  createLobby,
  addPlayer,
  getLobby,
  updateFlashcards,
} from "./serverHelpers.js";

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log(`connected to: ${socket.id}`);

  io.on("createLobby", (nickname) => {
    const lobby = createLobby(socket.id, nickname);
    socket.join(lobby.code);
    socket.emit("lobbyUpdated", lobby);
  });

  socket.on("joinLobby", (code, nickname) => {
    const lobby = addPlayer(code, socket.id, nickname);
    if (!lobby) return;
    socket.join(code);
    io.to(code).emit("lobbyUpdated", lobby);
  });

  socket.on("loadFlashcards", (cards) => {
    const lobby = getLobbyFromSocket(socket);
    if (!lobby) return;
    updateFlashcards(lobby.code, cards);
    io.to(lobby.code).emit("lobbyUpdated", lobby);
  });
});

function getLobbyFromSocket(socket: any): Lobby | null {
  for (const lobby of io.sockets.adapter.rooms.keys()) {
    const l = getLobby(lobby);
    if (l && l.players.find((p) => p.id === socket.id)) return l;
  }
  return null;
}

httpServer.listen(3000, () => console.log("Server running on :3000"));
