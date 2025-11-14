import type { Flashcard, Lobby } from "@shared/types.js";
import { generateCode, deleteCode } from "./codeGenerator.js";
import { addPlayer } from "./playerManager.js";

const lobbies = new Map<string, Lobby>();

// Creates a lobby
// @returns new lobby
export function createLobby(hostID: string, hostName: string): Lobby {
  const code = generateCode();
  const newLobby: Lobby = {
    code,
    hostID,
    players: [{ id: hostID, name: hostName, score: 0 }],
    flashcards: [],
    status: "waiting",
    settings: { shuffle: false, fuzzyTolerance: true },
  };
  lobbies.set(code, newLobby);
  return newLobby;
}

// Updates flashcards in a lobby
// @returns true, returns false when lobby not found (should never happen)
export function updateFlashcard(code: string, flashcards: Flashcard[]){
    const lobby = getLobby(code);
    if (!lobby){
        return false;
    }
    lobby.flashcards = flashcards;
    return true
}

// Adds player to lobby
// @returns the lobby again 
export function addPlayerToLobby(code: string, id: string, name: string){
    return addPlayer(code, id, name);
}

// Deletes a lobby
export function deleteLobby(code: string){
    deleteCode(code);
    lobbies.delete(code);
}

// Returns lobby from code
export function getLobby(code: string) {
  return lobbies.get(code);
}

// Gets list of all lobbies
export function getAllLobbies() {
  return Array.from(lobbies.values());
}
