import { useState, useEffect } from "react";

interface JoinFormProps {
  onJoin: (name: string, roomId?: string) => void;
  error?: string | null;
}

export const JoinForm = ({ onJoin, error }: JoinFormProps) => {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");

  // Check for room ID in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get("room");
    if (roomFromUrl) {
      setRoomId(roomFromUrl);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onJoin(name.trim(), roomId.trim() || undefined);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="container"
      style={{ marginTop: "10vh" }}
    >
      <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
        Planning Poker
      </h1>
      <p style={{ color: "#64748b", marginBottom: "2rem" }}>
        Join a session or create a new one
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          width: "100%",
          maxWidth: "400px",
          background: "var(--card-bg)",
          padding: "2rem",
          borderRadius: "var(--radius)",
          border: "1px solid var(--card-border)",
          boxShadow: "var(--shadow)",
        }}
      >
        {error && (
          <div
            style={{
              padding: "0.75rem",
              background: "#fee2e2",
              color: "#b91c1c",
              borderRadius: "8px",
              fontSize: "0.875rem",
              border: "1px solid #fecaca",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <label
            style={{ fontSize: "0.875rem", fontWeight: 600, opacity: 0.8 }}
          >
            Your Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. John Doe"
            autoFocus
            required
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius)",
              border: "2px solid var(--card-border)",
              fontSize: "1rem",
              outline: "none",
              background: "var(--bg-color)",
              color: "var(--text-color)",
            }}
          />
        </div>

        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <label
            style={{ fontSize: "0.875rem", fontWeight: 600, opacity: 0.8 }}
          >
            Room ID{" "}
            <span style={{ fontWeight: 400, opacity: 0.6 }}>(Optional)</span>
          </label>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Leave empty to create new"
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius)",
              border: "2px solid var(--card-border)",
              fontSize: "1rem",
              outline: "none",
              background: "var(--bg-color)",
              color: "var(--text-color)",
            }}
          />
        </div>

        <button
          type="submit"
          className="btn-primary"
          style={{ marginTop: "1rem" }}
        >
          {roomId.trim() ? "Join Existing Room" : "Create New Room"}
        </button>
      </div>
    </form>
  );
};
