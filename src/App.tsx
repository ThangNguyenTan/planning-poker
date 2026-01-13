import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Card } from "./components/Card";
import { Stats } from "./components/Stats";
import { JoinForm } from "./components/JoinForm";
import type { VoteValue, Participant } from "./types";
import { calculateStats } from "./utils/stats";

const FIBONACCI_SEQUENCE: VoteValue[] = [
  0,
  1,
  2,
  3,
  5,
  8,
  13,
  21,
  34,
  55,
  89,
  "?",
  "☕",
];

const SOCKET_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : window.location.origin;

const App = () => {
  const [user, setUser] = useState<Participant | null>(null);
  const [roomId, setRoomId] = useState<string>("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("theme") as "light" | "dark") || "light";
  });

  const socketRef = useRef<Socket | null>(null);

  const handleJoin = useCallback((name: string, rId?: string) => {
    setError(null);
    if (rId) {
      // Join existing
      socketRef.current?.emit("join", { name, roomId: rId });
      // We don't set user yet, wait for init/success
    } else {
      // Create new
      socketRef.current?.emit("create_room", { name });
    }
    // Store name for auto-reconnect
    localStorage.setItem("poker_user_name", name);
  }, []);

  // Initialize Socket.io connection
  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on("init", ({ participants, isRevealed }) => {
      setParticipants(participants);
      setIsRevealed(isRevealed);
    });

    socket.on("room_created", ({ roomId: newRoomId }) => {
      setRoomId(newRoomId);
      const savedName = localStorage.getItem("poker_user_name") || "User";
      setUser({ id: socket.id || "", name: savedName });

      // Update URL
      const url = new URL(window.location.href);
      url.searchParams.set("room", newRoomId);
      window.history.pushState({}, "", url);
    });

    socket.on("participants_update", (updatedParticipants: Participant[]) => {
      setParticipants(updatedParticipants);
      // If we were joining an existing room, we now know we're in
      const savedName = localStorage.getItem("poker_user_name");
      if (savedName && !user) {
        setUser({ id: socket.id || "", name: savedName });
        const params = new URLSearchParams(window.location.search);
        setRoomId(params.get("room") || "");
      }
    });

    socket.on("reveal_update", (revealed: boolean) => {
      setIsRevealed(revealed);
    });

    socket.on("error_message", (msg: string) => {
      setError(msg);
      setUser(null);
    });

    // Check for saved user and room in URL/localStorage for auto-reconnect
    const savedName = localStorage.getItem("poker_user_name");
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get("room");

    if (savedName && roomFromUrl) {
      handleJoin(savedName, roomFromUrl);
    }

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleJoin]);

  // Sync user ID when socket connects
  useEffect(() => {
    if (socketRef.current && user && !user.id) {
      const updateId = () => {
        setUser((prev) =>
          prev ? { ...prev, id: socketRef.current?.id || "" } : null
        );
      };
      socketRef.current.on("connect", updateId);
      if (socketRef.current.connected) updateId();
      return () => {
        socketRef.current?.off("connect", updateId);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Persist theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleVote = useCallback((value: VoteValue) => {
    socketRef.current?.emit("vote", value);
  }, []);

  const handleReveal = useCallback(() => {
    socketRef.current?.emit("reveal");
  }, []);

  const handleReset = useCallback(() => {
    socketRef.current?.emit("reset");
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const copyRoomLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    alert("Room link copied to clipboard!");
  }, []);

  const stats = useMemo(() => {
    const votes = participants
      .map((p) => p.vote)
      .filter((v): v is VoteValue => v !== undefined);
    return calculateStats(votes);
  }, [participants]);

  if (!user) {
    return <JoinForm onJoin={handleJoin} error={error} />;
  }

  const myVote = participants.find((p) => p.id === socketRef.current?.id)?.vote;

  return (
    <div className="container">
      <header
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem" }}>Planning Poker</h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              opacity: 0.7,
            }}
          >
            <span style={{ fontSize: "0.875rem" }}>
              Room: <strong>{roomId}</strong>
            </span>
            <button
              onClick={copyRoomLink}
              style={{
                background: "none",
                color: "var(--primary)",
                fontSize: "0.75rem",
                padding: "2px 6px",
                border: "1px solid var(--primary)",
                borderRadius: "4px",
              }}
            >
              Copy Link
            </button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.875rem", opacity: 0.7 }}>
            {user.name}
          </span>
          <button
            onClick={toggleTheme}
            className="btn-outline"
            style={{ padding: "0.5rem 1rem" }}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
      </header>

      <main className="container" style={{ width: "100%" }}>
        <section className="grid">
          {FIBONACCI_SEQUENCE.map((value) => (
            <Card
              key={value}
              value={value}
              isSelected={myVote === value}
              onClick={handleVote}
              disabled={isRevealed}
            />
          ))}
        </section>

        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          {!isRevealed ? (
            <button className="btn-primary" onClick={handleReveal}>
              Reveal Votes
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={handleReset}
              style={{ backgroundColor: "var(--danger)" }}
            >
              Reset Session
            </button>
          )}
        </div>

        <div className="container" style={{ width: "100%", maxWidth: "800px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              alignItems: "center",
            }}
          >
            <h3>Participants ({participants.length})</h3>
            {isRevealed && <Stats {...stats} />}
          </div>

          <div
            style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: "1.5rem",
              marginTop: "1rem",
            }}
          >
            {participants.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <div
                  className={`card ${isRevealed ? "revealed" : ""} ${
                    p.vote !== undefined && !isRevealed ? "selected" : ""
                  }`}
                  style={{ width: "100%", height: "140px", fontSize: "1.5rem" }}
                >
                  {isRevealed
                    ? p.vote ?? "-"
                    : p.vote !== undefined
                    ? "✓"
                    : "?"}
                </div>
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    textAlign: "center",
                  }}
                >
                  {p.name} {p.id === socketRef.current?.id ? "(You)" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
