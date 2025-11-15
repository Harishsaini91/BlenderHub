// server/index.js
require("dotenv").config();



const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");
const http = require("http");
const { Server } = require("socket.io");

const userRouter = require("./routes/userrouter");
const profilePageRouter = require("./routes/profilepage_router");
const notificationRouter = require("./routes/notifications");
const feedbackRoutes = require("./routes/feedback");
const filterRequestRoutes = require("./routes/filter_and_send_request");
const teamRoutes = require("./routes/team_request_router");
const chatRoutes = require("./routes/chatRoutes");
const projectFeedRoutes = require("./routes/project_feed");
const mutualSuggestionsRoute = require("./routes/mutual_suggestions");

const aiChatRouter = require("./routes/ai_routers/user_assistant_ai_chat/aiChatRouter");
const groqChatRouter = require("./routes/ai_routers/user_assistant_ai_chat/groqChatRouter");

const replicateRouter = require("./routes/ai_routers/image_generation_router/replicateRouter");
const deepaiRouter = require("./routes/ai_routers/image_generation_router/deepaiRouter");
const huggingfaceRouter = require("./routes/ai_routers/image_generation_router/huggingfaceRouter");

const videoRouter = require("./routes/video_edit_routers/video_to_image_sequence");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

/* ===============================================================
   GLOBAL MIDDLEWARE / CORS / BODY PARSING
   =============================================================== */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ===============================================================
   SOCKET.IO SETUP
   - keep userId → socketId map for presence and targeted emits
   =============================================================== */
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
  },
});

global._io = io;

// Map userId -> Set of socketIds (handles multiple tabs)
const onlineMap = new Map();

io.on("connection", (socket) => {
  console.log("⚡ Socket connected:", socket.id);

  // Retrieve userId from client auth payload or join event
  // Client code sends { auth: { userId } } when connecting (see ChatContext)
  const authUserId = socket.handshake?.auth?.userId || null;
  if (authUserId) {
    socket.userId = String(authUserId);
    // join personal room (for direct emits)
    socket.join(socket.userId);

    // store socket in map
    const set = onlineMap.get(socket.userId) || new Set();
    set.add(socket.id);
    onlineMap.set(socket.userId, set);

    // broadcast presence
    io.emit("user_online", socket.userId);
    console.log(`User ${socket.userId} is online (socket ${socket.id})`);
  }

  // Legacy/jump-in join event (some clients call socket.emit("join", userId))
  socket.on("join", (userId) => {
    if (!userId) return;
    socket.userId = String(userId);
    socket.join(socket.userId);

    const set = onlineMap.get(socket.userId) || new Set();
    set.add(socket.id);
    onlineMap.set(socket.userId, set);

    io.emit("user_online", socket.userId);
    console.log(`(join) User ${socket.userId} joined (socket ${socket.id})`);
  });

  // Join a chat room (per-room join)
  socket.on("joinChat", (chatRoomId) => {
    if (!chatRoomId) return;
    socket.join(String(chatRoomId));
    console.log(`Socket ${socket.id} joined chat room ${chatRoomId}`);
  });

  // Send a lightweight notification that a message was sent.
  // Clients can emit "messageSent" with payload { to: <userId>, roomId }
  // We'll emit `newMessageReceived` to the target user's personal room so they can refresh or display.
  socket.on("messageSent", (payload) => {
    try {
      const { to, roomId, message } = payload || {};
      if (to) {
        io.to(String(to)).emit("newMessageReceived", {
          roomId,
          senderSocket: socket.id,
          message,
        });
      }
      // also emit to room if provided so any sockets in that room receive it
      if (roomId) {
        io.to(String(roomId)).emit("newMessageReceived", {
          roomId,
          senderSocket: socket.id,
          message,
        });
      }
    } catch (err) {
      console.error("messageSent handler error:", err);
    }
  });

  // Optional: ping/presence heartbeat from client
  socket.on("heartbeat", (payload) => {
    // can be used to refresh presence TTL
    // payload may contain userId
  });

  socket.on("disconnect", () => {
    console.log("👋 Socket disconnected:", socket.id);
    if (socket.userId) {
      const set = onlineMap.get(socket.userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          onlineMap.delete(socket.userId);
          // user fully offline
          io.emit("user_offline", socket.userId);
          console.log(`User ${socket.userId} is offline`);
        } else {
          onlineMap.set(socket.userId, set);
        }
      }
    }
  });
});

/* ===============================================================
   ROUTES (keep same mounts as before)
   =============================================================== */
app.use("/api", userRouter);
app.use("/api", profilePageRouter);
app.use("/api", notificationRouter);
app.use("/api", feedbackRoutes);
app.use("/api", filterRequestRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api", projectFeedRoutes);
app.use("/api/mutual", mutualSuggestionsRoute);

// AI chat
app.use("/api", aiChatRouter);
app.use("/api", groqChatRouter);

// Image Generation
app.use("/api/image/replicate", replicateRouter);
app.use("/api/image/deepai", deepaiRouter);
app.use("/api/image/huggingface", huggingfaceRouter);

// Events Portal
app.use("/api/events", require("./routes/event_portal_router"));

// Video Editing
app.use("/api/video", videoRouter);

/* ===============================================================
   MONGODB
   =============================================================== */
mongoose
  .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/blender_community", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

/* ===============================================================
   START SERVER
   =============================================================== */
server.listen(PORT, () => {
  console.log(`🟢 Server running at: http://localhost:${PORT}`);
});
