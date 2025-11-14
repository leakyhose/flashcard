import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import type { Lobby } from "@shared/types";

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);
  const [nickname, setNickname] = useState("");
  const [codeInput, setCodeInput] = useState("");

  useEffect(() => {
    if (location.state?.notFound) {
      setNotFound(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    const handleLobbyUpdated = (lobby: Lobby) => {
      navigate(`/${lobby.code}`, {
        replace: true,
        state: { nickname },
      });
    };

    const handleLobbyData = (lobby: Lobby | null) => {
      if (lobby === null) {
        alert("Lobby not found! Please check the code.");
      } else {
        // Lobby exists, now join it
        socket.emit("joinLobby", lobby.code, nickname);
      }
    };

    socket.on("lobbyUpdated", handleLobbyUpdated);
    socket.on("lobbyData", handleLobbyData);

    return () => {
      socket.off("lobbyUpdated", handleLobbyUpdated);
      socket.off("lobbyData", handleLobbyData);
    };
  }, [navigate, nickname]);

  const handleCreateLobby = () => {
    if (!nickname.trim()) return;
    socket.emit("createLobby", nickname);
  };

  const handleJoinLobby = () => {
    if (!nickname.trim() || !codeInput.trim()) return;
    socket.emit("getLobby", codeInput);
  };

  return (
    <>
      {notFound && <div>That lobby doesnt exist!</div>}
      <div>
        <h1>Flashcard</h1>

        <input
          value={nickname}
          onChange={(name) => setNickname(name.target.value)}
        />

        <div>
          <button onClick={handleCreateLobby}>Create Lobby</button>
        </div>

        <div>
          <input
            placeholder="Lobby code"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
          />
          <button onClick={handleJoinLobby}>Join Lobby</button>
        </div>
      </div>
    </>
  );
}
