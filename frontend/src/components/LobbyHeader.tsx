import type { Lobby } from "@shared/types";
import { socket } from "../socket";

interface LobbyHeaderProps {
  code: string;
  nickname: string;
  isLeader: boolean;
  lobby: Lobby;
}

export function LobbyHeader({ code, nickname, isLeader, lobby}: LobbyHeaderProps) {
  const handleStartGame = () => {
    socket.emit("startGame");
  };

  return (
    <div className="flex p-3 border-b items-center">
      <div className="font-bold shrink-0 w-64">Lobby Code: {code}</div>
      <div className="flex-1 flex justify-center">
        {
          isLeader ? (
              lobby.flashcards.length == 0 ? (
                  <div>Upload or create Flashcards to start</div>
              ) : (
                  lobby.status === "waiting" || lobby.status === "finished" ? (
                      <button
                        onClick={handleStartGame}
                      >
                        {lobby.status === "finished" ? "Play Again" : "Start"}
                      </button>
                  ) : (
                      <div>Game in Progress</div>
                  )
              )
          ) : (
              lobby.flashcards.length == 0 ? (
                  <div>Waiting for leader to upload or create Flashcards...</div>
              ) : (
                  lobby.status === "ongoing" ? (
                      <div>Game in progress...</div>
                  ) : (
                      <div>Waiting for leader to start...</div>
                  )
              )
          )
        }
      </div>
      <div className="font-bold shrink-0 w-80 text-right">Nickname: {nickname}</div>
    </div>
  );
}
