require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");
const http = require("http");
const { Server } = require("socket.io");

// Routers…
const userRouter = require("./routes/userrouter");
const profilePageRouter = require("./routes/profilepage_router");
const notificationRouter = require("./routes/notifications");
const feedbackRoutes = require("./routes/feedback");
const filterRequestRoutes = require("./routes/filter_and_send_request");
const teamRoutes = require("./routes/team_request_router");
const chatRoutes = require("./routes/chatRoutes");
const projectFeedRoutes = require("./routes/project_feed");
const mutualSuggestionsRoute = require("./routes/mutual_suggestions");

// AI chat
const aiChatRouter = require("./routes/ai_routers/user_assistant_ai_chat/aiChatRouter");
const groqChatRouter = require("./routes/ai_routers/user_assistant_ai_chat/groqChatRouter");

// Image generation
const replicateRouter = require("./routes/ai_routers/image_generation_router/replicateRouter");
const deepaiRouter = require("./routes/ai_routers/image_generation_router/deepaiRouter");
const huggingfaceRouter = require("./routes/ai_routers/image_generation_router/huggingfaceRouter");

// Video router
const videoRouter = require("./routes/video_edit_routers/video_to_image_sequence");

const app = express();
const server = http.createServer(app);
const PORT = 5000;

/* ===============================================================
   ✅ GLOBAL CORS (Express layer)
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

// Static assets
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ===============================================================
   ✅ SOCKET.IO WITH FULL CORS (Fixes DELETE / PUT network error)
=============================================================== */
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
  },
});

global._io = io;

io.on("connection", (socket) => {
  console.log("⚡ New connection:", socket.id);

  socket.on("join", (userId) => userId && socket.join(userId));

  socket.on("messageSent", ({ to }) => {
    if (to) io.to(to).emit("newMessageReceived");
  });

  socket.on("disconnect", () => console.log("👋 Disconnected:", socket.id));
});

/* ===============================================================
   ✅ Main API Routers
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

// Events Portal (your event system)
app.use("/api/events", require("./routes/event_portal_router"));

// Video Editing
app.use("/api/video", videoRouter);

/* ===============================================================
   ✅ MongoDB Connection
=============================================================== */
mongoose
  .connect("mongodb://127.0.0.1:27017/blender_community", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

/* ===============================================================
   ✅ Start Server
=============================================================== */
server.listen(PORT, () => {
  console.log(`🟢 Server running at: http://localhost:${PORT}`);
});
