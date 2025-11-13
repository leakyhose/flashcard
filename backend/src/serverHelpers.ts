import type { Lobby, Player, Flashcard } from "@shared/types.js";
const lobbies = new Map<string, Lobby>();
const codes = new Set();

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

export function generateCode(length: number = 4) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";

  while(codes.has(code)){
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
  }}

  codes.add(code);
  return code;
}

export function deleteLobby(code: string){
  codes.delete(code);
  lobbies.delete(code);
}

export function getLobby(code: string) {
  return lobbies.get(code);
}

export function addPlayer(
  code: string,
  id: string,
  name: string,
): Lobby | null {
  const lobby = getLobby(code);
  if (!lobby) return null;
  if (lobby.players.find((p) => p.id === id)) return lobby;
  lobby.players.push({ id, name, score: 0 });
  return lobby;
}

export function getAllLobbies() {
  return Array.from(lobbies.values());
}

export function updateFlashcards(code: string, flashcards: Flashcard[]) {
  const lobby = getLobby(code);
  if (lobby) lobby.flashcards = flashcards;
}

