import type { Socket, Server } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@shared/types.js";

import { getLobbyBySocket } from "../lobbyManager.js";

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedIO = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerChatHandlers(socket: TypedSocket, io: TypedIO): void {
  socket.on("sendChat", (msg) => {
    const lobby = getLobbyBySocket(socket.id);
    if (!lobby) {
      console.log("Failed to send chat: lobby not found");
      return;
    }
    const player = lobby.players.find((p) => p.id === socket.id);
    if (!player) {
      console.log("Failed to send chat: player not found");
      return;
    }
    io.to(lobby.code).emit("chatMessage", {
      player: player.name,
      id: player.id,
      text: msg,
    });
  });
}
