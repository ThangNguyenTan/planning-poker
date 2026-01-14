import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Card } from "./components/Card";
import { Stats } from "./components/Stats";
import { JoinForm } from "./components/JoinForm";
import type { VoteValue, Participant } from "./types";
import { calculateStats } from "./utils/stats";
import { supabase } from "./lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

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

const App = () => {
  const [user, setUser] = useState<Participant | null>(() => {
    const savedName = localStorage.getItem("poker_user_name");
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get("room");
    if (savedName && roomFromUrl) {
      return {
        id: Math.random().toString(36).substring(2, 9),
        name: savedName,
      };
    }
    return null;
  });

  const [roomId, setRoomId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("room") || "";
  });

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("theme") as "light" | "dark") || "light";
  });

  const channelRef = useRef<RealtimeChannel | null>(null);

  // Helper to generate XXX-XXX-XXX format
  const generateRoomId = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const segment = () =>
      Array.from(
        { length: 3 },
        () => chars[Math.floor(Math.random() * chars.length)]
      ).join("");
    return `${segment()}-${segment()}-${segment()}`;
  };

  const handleJoin = useCallback(async (name: string, rId?: string) => {
    setError(null);

    let targetRoomId = rId;

    if (!targetRoomId) {
      // Create new room
      targetRoomId = generateRoomId();
      // Optional: Persist to Supabase DB if table exists
      await supabase
        .from("rooms")
        .insert([{ id: targetRoomId, is_revealed: false }])
        .select();
    } else {
      // Check if room exists
      const { data, error: fetchError } = await supabase
        .from("rooms")
        .select("id, is_revealed")
        .eq("id", targetRoomId)
        .single();

      if (fetchError || !data) {
        setError(
          "Room does not exist. Please check the ID or create a new room."
        );
        return;
      }
      setIsRevealed(data.is_revealed);
    }

    setRoomId(targetRoomId);
    const newUser = { id: Math.random().toString(36).substring(2, 9), name };
    setUser(newUser);
    localStorage.setItem("poker_user_name", name);

    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set("room", targetRoomId);
    window.history.pushState({}, "", url);
  }, []);

  // Initialize Supabase Realtime
  useEffect(() => {
    if (!user || !roomId) return;

    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat() as unknown as Participant[];
        setParticipants(
          users.map((u) => ({ id: u.id, name: u.name, vote: u.vote }))
        );
      })
      .on("broadcast", { event: "vote" }, () => {
        // We rely on presence for the "source of truth" of votes
      })
      .on("broadcast", { event: "reveal" }, () => {
        setIsRevealed(true);
      })
      .on("broadcast", { event: "reset" }, () => {
        setIsRevealed(false);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            id: user.id,
            name: user.name,
            vote: undefined,
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [user, roomId]);

  // Handle voting via Presence update
  const handleVote = useCallback(
    (value: VoteValue) => {
      if (!channelRef.current || !user) return;

      channelRef.current.track({
        id: user.id,
        name: user.name,
        vote: value,
      });
    },
    [user]
  );

  const handleReveal = useCallback(async () => {
    if (!channelRef.current) return;
    setIsRevealed(true);
    channelRef.current.send({
      type: "broadcast",
      event: "reveal",
      payload: {},
    });
    // Persist to DB
    await supabase.from("rooms").update({ is_revealed: true }).eq("id", roomId);
  }, [roomId]);

  const handleReset = useCallback(async () => {
    if (!channelRef.current || !user) return;
    setIsRevealed(false);
    channelRef.current.send({
      type: "broadcast",
      event: "reset",
      payload: {},
    });
    // Reset own vote in presence
    channelRef.current.track({
      id: user.id,
      name: user.name,
      vote: undefined,
    });
    // Persist to DB
    await supabase
      .from("rooms")
      .update({ is_revealed: false })
      .eq("id", roomId);
  }, [user, roomId]);

  // Persist theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

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

  const myVote = participants.find((p) => p.id === user.id)?.vote;

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
                  {p.name} {p.id === user.id ? "(You)" : ""}
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
