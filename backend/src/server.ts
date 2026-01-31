import { config } from "dotenv";
config();

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@shared/types.js";

import { getLobbyBySocket } from "./lobbyManager.js";

import {
  registerLobbyHandlers,
  registerFlashcardHandlers,
  registerGameHandlers,
  registerChatHandlers,
  handleDisconnect,
} from "./handlers/index.js";

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: "*" },
  maxHttpBufferSize: 1e7, // 10MB
});

app.use(express.json());
app.get("/status", (req, res) => {
  res.json({
    status: "Running",
    timestamp: new Date().toISOString(),
    message: "CI/CD pipeline is working",
  });
});

const activeRounds = new Map<
  string,
  {
    endRound: () => void;
    roundStartTime: number;
    roundEnded: boolean;
  }
>();

io.on("connection", (socket) => {
  console.log(`connected to: ${socket.id}`);

  registerLobbyHandlers(socket, io, activeRounds);
  registerFlashcardHandlers(socket, io);
  registerGameHandlers(socket, io, activeRounds);
  registerChatHandlers(socket, io);

  socket.on("disconnect", () => {
    handleDisconnect(socket, io, activeRounds, getLobbyBySocket);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Server running on :${PORT}`));
