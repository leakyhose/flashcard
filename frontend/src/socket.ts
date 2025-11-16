import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@shared/types";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  BACKEND_URL,
);

socket.on("connect", () => {
  console.log("Connected to backend:", socket.id);
});

socket.on("disconnect", () => {
  console.log("Disconnected from backend");
});
