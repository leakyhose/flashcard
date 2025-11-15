import type { Player } from "@shared/types";
import { socket } from "../socket";

interface PlayersProps {
  players: Player[];
}

export function Players({ players }: PlayersProps) {
  const handleUpdateLeader = (nextLeaderId: string) => {
    if (players[0].id !== socket.id) return; // Only current leader can change leader
    socket.emit("updateLeader", nextLeaderId);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ul className="flex-1 overflow-auto">
        {players.map((player) => (
          <li key={player.id} className="border-b">
            <div
              onClick={() => handleUpdateLeader(player.id)}
              className="p-3 hover:bg-gray-100 cursor-pointer truncate"
            >
              {player.name} - {player.score}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
