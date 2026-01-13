import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, "../dist")));

// Store session state per room
const rooms = {};

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

io.on("connection", (socket) => {
  let currentRoomId = null;

  const leavePreviousRoom = () => {
    if (currentRoomId && rooms[currentRoomId]) {
      rooms[currentRoomId].participants = rooms[
        currentRoomId
      ].participants.filter((p) => p.id !== socket.id);
      socket
        .to(currentRoomId)
        .emit("participants_update", rooms[currentRoomId].participants);
      socket.leave(currentRoomId);

      if (rooms[currentRoomId].participants.length === 0) {
        delete rooms[currentRoomId];
      }
    }
  };

  socket.on("create_room", ({ name }) => {
    leavePreviousRoom();
    const newRoomId = generateRoomId();
    rooms[newRoomId] = { participants: [], isRevealed: false };
    currentRoomId = newRoomId;
    socket.join(currentRoomId);
    rooms[currentRoomId].participants.push({
      id: socket.id,
      name,
      vote: undefined,
    });
    socket.emit("room_created", { roomId: newRoomId });
    socket.emit("init", {
      participants: rooms[currentRoomId].participants,
      isRevealed: rooms[currentRoomId].isRevealed,
    });
    io.to(currentRoomId).emit(
      "participants_update",
      rooms[currentRoomId].participants
    );
  });

  socket.on("join", ({ name, roomId }) => {
    if (!rooms[roomId]) {
      socket.emit(
        "error_message",
        "Room does not exist. Please check the ID or create a new room."
      );
      return;
    }
    leavePreviousRoom();
    currentRoomId = roomId;
    socket.join(currentRoomId);
    const exists = rooms[currentRoomId].participants.some(
      (p) => p.id === socket.id
    );
    if (!exists) {
      rooms[currentRoomId].participants.push({
        id: socket.id,
        name,
        vote: undefined,
      });
    }
    socket.emit("init", {
      participants: rooms[currentRoomId].participants,
      isRevealed: rooms[currentRoomId].isRevealed,
    });
    io.to(currentRoomId).emit(
      "participants_update",
      rooms[currentRoomId].participants
    );
  });

  socket.on("vote", (vote) => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    rooms[currentRoomId].participants = rooms[currentRoomId].participants.map(
      (p) => (p.id === socket.id ? { ...p, vote } : p)
    );
    io.to(currentRoomId).emit(
      "participants_update",
      rooms[currentRoomId].participants
    );
  });

  socket.on("reveal", () => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    rooms[currentRoomId].isRevealed = true;
    io.to(currentRoomId).emit("reveal_update", true);
  });

  socket.on("reset", () => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    rooms[currentRoomId].isRevealed = false;
    rooms[currentRoomId].participants = rooms[currentRoomId].participants.map(
      (p) => ({ ...p, vote: undefined })
    );
    io.to(currentRoomId).emit("reveal_update", false);
    io.to(currentRoomId).emit(
      "participants_update",
      rooms[currentRoomId].participants
    );
  });

  socket.on("disconnect", () => {
    leavePreviousRoom();
  });
});

// Handle any requests that don't match the ones above
// Using named parameter for Express v5 wildcard compatibility
app.get("/:path*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
