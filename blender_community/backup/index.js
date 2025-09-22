const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");
const http = require("http");
const { Server } = require("socket.io");

const userRouter = require("./routes/userrouter");
const profilePageRouter = require("./routes/profilepage_router");
const notificationRouter = require("./routes/notifications"); // 👈 if added
const feedbackRoutes = require("./routes/feedback");
const filter_and_send_request = require("./routes/filter_and_send_request");
const teamRoutes = require("./routes/team_request_router");
const chatRoutes = require("./routes/chatRoutes");



const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // ⚠️ adjust this in production
    methods: ["GET", "POST"]
  }
});

const PORT = 5000;

// 🔌 Socket.io Setup
io.on("connection", (socket) => {
  console.log("⚡ A user connected");

  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`🔔 User joined room: ${userId}`);
  });
 
  socket.on("connectionResponse", ({ to }) => {
    io.to(to).emit("receiveConnectionUpdate");
  });

  socket.on("disconnect", () => {
    console.log("👋 A user disconnected");
  });
});

// 🛡 Middleware
app.use(cors());

// 🧠 Smart parser (multipart OR json)
app.use((req, res, next) => {
  const type = req.headers["content-type"];
  if (type && type.includes("multipart/form-data")) {
    next(); // Skip JSON parser for file uploads
  } else {
    express.json()(req, res, next);
  }
});

// 🗂 Serve static file uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

// 🧱 Body parsers (large payload support)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
// app.use(express.json());

// 📁 Routes
app.use("/api", userRouter);
app.use("/api", profilePageRouter);
app.use("/api", notificationRouter); // 👈 if you created it
app.use("/api", feedbackRoutes);
app.use("/api", filter_and_send_request);
app.use("/api/team", teamRoutes);
app.use("/api/chat", chatRoutes);

// ⚡ MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/blender_community")
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// 🚀 Start Express + Socket server
server.listen(PORT, () => {
  console.log(`🟢 Server running at: http://localhost:${PORT}`);
});
