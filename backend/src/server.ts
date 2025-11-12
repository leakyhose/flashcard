import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  Lobby,
} from "@shared/types.js"

import  { createLobby, addPlayer, getLobby, updateFlashcards } from "./serverHelpers.js"

const app = express();
const httpServer = createServer(app)

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: "*" },
})

io.on("connection", socket => {
  console.log(`connected to: ${socket.id}`)

})