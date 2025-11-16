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

  const isLeader = players[0]?.id === socket.id;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ul className="flex-1 overflow-auto border border-grey-100">
        {players.map((player) => (
          <li
            key={player.id}
            className="border border-grey-100 flex w-full group relative"
          >
            <div
              className={`flex w-full ${isLeader && player.id != socket.id ? "cursor-pointer group-hover:opacity-0 transition-opacity" : ""}`}
              onClick={() => isLeader && handleUpdateLeader(player.id)}
            >
              <div className="truncate basis-[70%] shrink p-3">
                {player.name}
              </div>
              <div className="p-3 truncate basis-[30%] shrink-0 flex justify-center">
                {player.score}
              </div>
            </div>
            {isLeader && player.id != socket.id && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="text-sm font-semibold">Click to promote</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
