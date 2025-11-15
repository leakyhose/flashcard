interface LobbyHeaderProps {
  code: string;
  nickname: string;
}

export function LobbyHeader({ code, nickname }: LobbyHeaderProps) {
  return (
    <div className="flex gap-4 p-4 border-b">
      <div className="font-bold">Lobby Code: {code}</div>
      <div>Your name: {nickname}</div>
    </div>
  );
}
