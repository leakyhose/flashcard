import { useParams, useLocation } from "react-router-dom";
import { useState } from "react";
import { socket } from "../socket";
import { useCodeValidation } from "../hooks/useCodeValidation";
import { useLobbyData } from "../hooks/useLobbyData";

export default function Lobby() {
  const { code } = useParams();
  const location = useLocation();
  const [nickname, setNickname] = useState<string>(
    location.state?.nickname || "",
  );
  const [nicknameInput, setNicknameInput] = useState("");
  const [leader, setLeader] = useState(false);

  useCodeValidation(code);

  const lobby = useLobbyData(code);

  const handleJoinLobby = () => {
    if (!nicknameInput.trim()) return;
    setNickname(nicknameInput);
    socket.emit("joinLobby", code!, nicknameInput);
  };

  if (lobby === undefined) {
    return <div>Loading lobby...</div>;
  }

  if (lobby === null) {
    return null;
  }

  if (!nickname) {
    return (
      <div>
        <h2>Join Lobby: {lobby.code}</h2>
        <p>Please enter your nickname to join:</p>
        <input
          type="text"
          placeholder="Your nickname"
          value={nicknameInput}
          onChange={(e) => setNicknameInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleJoinLobby();
          }}
          autoFocus
        />
        <button onClick={handleJoinLobby}>Join</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Lobby Code: {lobby.code}</h2>
      <h3>Players:</h3>
      <ul>
        {lobby.players.map((player) => (
          <li key={player.id}>
            {player.name} - Score: {player.score}
          </li>
        ))}
      </ul>
      <p>Status: {lobby.status}</p>
      <p>Flashcards: {lobby.flashcards.length}</p>
    </div>
  );
}
