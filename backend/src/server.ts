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
  getLobby,
  addPlayerToLobby,
  updateFlashcard,
} from "./lobbyManager.js";

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: "*" },
});

// All socket.on that change lobby should emit, "lobbyUpdated", with accomanying lobby
// Requests to change the lobby should not include code either, server can figure it out itself
io.on("connection", (socket) => {
  console.log(`connected to: ${socket.id}`);

  // Creates lobby
  socket.on("createLobby", (nickname) => {
    const lobby = createLobby(socket.id, nickname);
    socket.join(lobby.code);
    socket.emit("lobbyUpdated", lobby);
  });

  // Joins a lobby
  socket.on("joinLobby", (code, nickname) => {
    const lobby = addPlayerToLobby(code, socket.id, nickname);
    if (!lobby) {
      console.log(`Failed to join lobby ${code}: lobby not found`);
      return;
    }
    socket.join(code);
    io.to(code).emit("lobbyUpdated", lobby);
  });

  // Loads flashcards, doesnt take code rather figures it out itself
  socket.on("loadFlashcards", (cards) => {
    const lobby = getLobbyFromSocket(socket);
    if (!lobby) {
      console.log(`Failed to load flashcards: player not in a lobby`);
      return;
    }
    const success = updateFlashcard(lobby.code, cards);
    if (!success) {
      console.log(`Failed to update flashcards`);
      return;
    }
    io.to(lobby.code).emit("lobbyUpdated", lobby);
  });

  socket.on("getLobby", (code) => {
    const lobby = getLobby(code);
    socket.emit("lobbyData", lobby || null);
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
