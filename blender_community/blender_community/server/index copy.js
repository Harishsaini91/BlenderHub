// server.js
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
const chatRoutes = require("./routes/chatRoutes"); // Socket-related logic inside
// const uploadProjectRoutes = require("./routes/upload_project");

const projectFeedRoutes = require("./routes/project_feed");
const mutualSuggestionsRoute = require("./routes/mutual_suggestions");

// ai
// ai chat
const aiChatRouter = require("./routes/ai_routers/user_assistant_ai_chat/aiChatRouter");
const groqChatRouter = require("./routes/ai_routers/user_assistant_ai_chat/groqChatRouter");

// image generate
// const replicateRouter = require("./routes/ai_routers/image_generation_router/replicateRouter");
// const huggingfaceRouter = require("./routes/ai_routers/image_generation_router/huggingfaceRouter");

// const deepaiRouter = require("./routes/ai_routers/image_generation_router/deepaiRouter");



const app = express();
const server = http.createServer(app);
const PORT = 5000;
app.use(cors());

// 🔌 Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: "*", // ✅ Replace with your frontend origin in production
    methods: ["GET", "POST"]
  }
});

// 🌐 Make io available globally
global._io = io;

// 📡 Socket Events
io.on("connection", (socket) => {
  console.log("⚡ New connection:", socket.id);

  socket.on("join", (userId) => {
    if (userId) {
      socket.join(userId);
      console.log(`👤 User ${userId} joined personal room`);
    }
  });

  socket.on("messageSent", ({ to }) => {
    if (to) io.to(to).emit("newMessageReceived");
  });

  socket.on("disconnect", () => {
    console.log("👋 Disconnected:", socket.id);
  });
});

// 🛡 CORS Middleware
app.use(cors());

// 🧠 Handle body parsing based on content type
app.use((req, res, next) => {
  const contentType = req.headers["content-type"];
  if (contentType && contentType.includes("multipart/form-data")) {
    next(); // Skip JSON parsing for file uploads
  } else {
    express.json()(req, res, next);
  }
});

// 📁 Serve Uploaded Files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 🧱 Support Large Request Payloads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// 📂 Mount Routes
app.use("/api", userRouter);
app.use("/api", profilePageRouter);
app.use("/api", notificationRouter);
app.use("/api", feedbackRoutes);
app.use("/api", filterRequestRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/chat", chatRoutes);  // whatshap chat
// app.use("/api", uploadProjectRoutes);
app.use("/api", projectFeedRoutes);
app.use("/api/mutual", mutualSuggestionsRoute);

// ai router
app.use("/api", aiChatRouter);
app.use("/api", groqChatRouter);
// index.js

// app.use("/api/image/replicate", replicateRouter);
// app.use("/api/image/huggingface", huggingfaceRouter);
// app.use("/api/image/deepai", deepaiRouter);



const replicateRouter = require("./routes/ai_routers/image_generation_router/replicateRouter");
const deepaiRouter = require("./routes/ai_routers/image_generation_router/deepaiRouter");
const huggingfaceRouter = require("./routes/ai_routers/image_generation_router/huggingfaceRouter");

app.use("/api/image/replicate", replicateRouter);
app.use("/api/image/deepai", deepaiRouter);
app.use("/api/image/huggingface", huggingfaceRouter);



// ⚙️ MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/blender_community", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// 🚀 Start Server
server.listen(PORT, () => {
  console.log(`🟢 Server running at: http://localhost:${PORT}`);
});
