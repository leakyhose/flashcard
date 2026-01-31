import type { Socket, Server } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@shared/types.js";

import {
  getLobbyBySocket,
  updateFlashcard,
  updateSettings,
} from "../lobbyManager.js";

import {
  generateDistractors,
  areDistractorsGenerating,
} from "../gameManager.js";

import { filterFlashcardsForBroadcast } from "../utils/flashcardFilter.js";

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedIO = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerFlashcardHandlers(
  socket: TypedSocket,
  io: TypedIO
): void {
  socket.on(
    "updateFlashcard",
    async (
      cards,
      setName,
      setID,
      description,
      allowView,
      allowSave,
      authorId,
      authorName,
      createdAt,
      updatedAt
    ) => {
      const lobby = updateFlashcard(
        socket.id,
        cards,
        setName,
        setID,
        description,
        allowView,
        allowSave,
        authorId,
        authorName,
        createdAt,
        updatedAt
      );
      if (!lobby) {
        console.log(`Failed to update flashcards`);
        return;
      }

      lobby.distractorStatus = "idle";

      const flashcardsForBroadcast = filterFlashcardsForBroadcast(
        lobby.flashcards,
        lobby.allowView
      );

      io.to(lobby.code).emit(
        "flashcardsUpdated",
        flashcardsForBroadcast,
        lobby.flashcardID,
        lobby.flashcardName,
        lobby.flashcardDescription,
        lobby.allowView,
        lobby.allowSave,
        lobby.flashcardAuthorId,
        lobby.flashcardAuthorName,
        lobby.flashcardCreatedAt,
        lobby.flashcardUpdatedAt
      );

      io.to(lobby.code).emit("settingsUpdated", lobby.settings);
    }
  );

  socket.on("updateSettings", async (settings) => {
    const lobby = updateSettings(socket.id, settings);
    if (!lobby) {
      console.log(`Failed to update settings`);
      return;
    }

    io.to(lobby.code).emit("settingsUpdated", lobby.settings);
  });

  socket.on("generateMultipleChoice", async (mode) => {
    const lobby = getLobbyBySocket(socket.id);
    if (!lobby) {
      console.log("Failed to generate: lobby not found");
      return;
    }

    if (lobby.leader !== socket.id) {
      console.log(lobby.leader, socket.id);
      console.log("Only host can generate multiple choice options");
      return;
    }

    if (lobby.flashcards.length === 0) {
      console.log("No flashcards to generate for");
      return;
    }

    if (areDistractorsGenerating(lobby.code)) {
      console.log(
        `Distractors already generating for ${lobby.code}, skipping...`
      );
      return;
    }

    lobby.distractorStatus = "generating";
    lobby.generationProgress = "Starting generation...";
    io.to(lobby.code).emit(
      "distractorStatusUpdated",
      "generating",
      "Starting generation..."
    );

    try {
      await generateDistractors(lobby.code, mode, (progress) => {
        lobby.generationProgress = progress;
        io.to(lobby.code).emit(
          "distractorStatusUpdated",
          "generating",
          progress
        );
      });
      lobby.distractorStatus = "ready";
      lobby.generationProgress = undefined;

      const flashcardsForBroadcast = filterFlashcardsForBroadcast(
        lobby.flashcards,
        lobby.allowView
      );

      io.to(lobby.code).emit(
        "flashcardsUpdated",
        flashcardsForBroadcast,
        lobby.flashcardID,
        lobby.flashcardName,
        lobby.flashcardDescription,
        lobby.allowView,
        lobby.allowSave,
        lobby.flashcardAuthorId,
        lobby.flashcardAuthorName,
        lobby.flashcardCreatedAt,
        lobby.flashcardUpdatedAt
      );
      io.to(lobby.code).emit("distractorStatusUpdated", "ready");
    } catch (error) {
      console.error("Error generating distractors:", error);
      lobby.distractorStatus = "error";
      lobby.generationProgress = undefined;
      io.to(lobby.code).emit("distractorStatusUpdated", "error");
    }
  });
}
