import type { Lobby, Player} from "@shared/types.js";
import { getLobby } from "./lobbyManager.js";

// Adds player to lobby, returns lobby either way if player is in or not
// Eventually will add functionality for when duplicate players exist
export function addPlayer(
  code: string,
  id: string,
  name: string,
): Lobby | null {
  const lobby = getLobby(code);
  if (!lobby) return null;
  if (lobby.players.find((p: Player) => p.id === id)) return lobby;
  lobby.players.push({ id, name, score: 0 });
  return lobby;
}

