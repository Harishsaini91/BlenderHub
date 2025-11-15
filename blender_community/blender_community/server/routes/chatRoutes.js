// routes/chatRoutes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const ChatRoom = require("../models/ChatRoom_schema");
const User = require("../models/User");

const router = express.Router();

/* ============================================================
   🔧 FILE UPLOAD CONFIG
============================================================ */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "uploads/chat_files";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const unique = `${Date.now()}${path.extname(file.originalname)}`;
    cb(null, `file_${unique}`);
  },
});
const upload = multer({ storage });

/* ============================================================
   1️⃣ GET ALL MEMBERS CONNECTED TO USER
============================================================ */
router.get("/members/:userId", async (req, res) => {
  try {
    const me = await User.findById(req.params.userId)
      .populate({
        path: "members._id",
        select: "name image",
      })
      .lean();

    if (!me) return res.status(404).json({ error: "User not found" });

    const members = me.members.map((m) => ({
      _id: m._id._id,
      name: m._id.name,
      image: m._id.image || null,
    }));

    return res.json(members);
  } catch (err) {
    console.error("Error getting members:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================
   2️⃣ GET ALL ROOMS OF A USER
============================================================ */
router.get("/user-rooms/:userId", async (req, res) => {
  try {
    const uid = new mongoose.Types.ObjectId(req.params.userId);

    let rooms = await ChatRoom.find({
      "members._id": uid,
    }).lean();

    // load user profiles for member details
    const ids = [
      ...new Set(
        rooms.flatMap((r) => r.members.map((m) => m._id.toString()))
      ),
    ];

    const users = await User.find(
      { _id: { $in: ids } },
      "name image"
    ).lean();

    const userMap = {};
    users.forEach((u) => (userMap[u._id] = u));

    rooms = rooms.map((r) => ({
      ...r,
      members: r.members.map((m) => ({
        _id: m._id,
        name: userMap[m._id]?.name || "Unknown",
        image: userMap[m._id]?.image || null,
      })),
    }));

    return res.json(rooms);
  } catch (err) {
    console.error("Error fetching rooms:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================
   3️⃣ CREATE EMPTY ROOM (NOT USED ANYMORE BY NEW SYSTEM)
============================================================ */
router.post("/room", async (req, res) => {
  try {
    const { userId, username, otherId, othername } = req.body;

    let room = await ChatRoom.findOne({
      "members._id": { $all: [userId, otherId] },
    });

    if (!room) {
      room = await ChatRoom.create({
        members: [
          { _id: userId, name: username },
          { _id: otherId, name: othername },
        ],
        messages: {},
      });
    }

    return res.json(room);
  } catch (err) {
    console.error("Error creating room:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================
   4️⃣ CREATE ROOM WITH FIRST MESSAGE
   — For TEMP ROOMS only!
============================================================ */
router.post(
  "/room/create_with_message",
  upload.single("file"),
  async (req, res) => {
    try {
      const { senderId, senderName, receiverId, receiverName, text } = req.body;

      if (!senderId || !receiverId) {
        return res.status(400).json({ error: "Missing user IDs" });
      }

      let fileBlock = null;
      if (req.file) {
        fileBlock = {
          fileName: req.file.originalname,
          fileUrl: `/uploads/chat_files/${req.file.filename}`,
          fileType: req.file.mimetype,
          time: new Date(),
          status: { selfDelete: false, bothDeleted: false },
        };
      }

      const msg = {
        text: text || "",
        time: new Date(),
        status: { selfDelete: false, bothDeleted: false },
      };

      // CREATE NEW CHAT ROOM
      const room = await ChatRoom.create({
        members: [
          { _id: senderId, name: senderName },
          { _id: receiverId, name: receiverName },
        ],
        messages: {
          [senderName]: {
            text: text ? [msg] : [],
            file: fileBlock ? [fileBlock] : [],
          },
        },
        lastMessage: {
          text: text || req.file?.originalname || "",
          sender: senderName,
          createdAt: new Date(),
        },
      });

      // Emit message to receiver
      if (global._io) {
        global._io.to(receiverId).emit("newMessageReceived", {
          roomId: room._id,
          senderId,
          message: fileBlock || msg,
        });
      }

      return res.json({
        success: true,
        roomId: room._id,
        message: fileBlock || msg,
      });
    } catch (err) {
      console.error("Error create_with_message:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

/* ============================================================
   5️⃣ SEND MESSAGE TO EXISTING ROOM
============================================================ */
router.post("/message/:roomId", upload.single("file"), async (req, res) => {
  try {
    const { senderId, senderName, text } = req.body;
    const roomId = req.params.roomId;

    const room = await ChatRoom.findById(roomId);
    if (!room) return res.status(404).json({ error: "Room not found" });

    const receiver = room.members.find(
      (m) => String(m._id) !== String(senderId)
    );
    const receiverId = receiver?._id.toString();

    let messageBlock = null;

    if (req.file) {
      messageBlock = {
        fileName: req.file.originalname,
        fileUrl: `/uploads/chat_files/${req.file.filename}`,
        fileType: req.file.mimetype,
        time: new Date(),
        status: { selfDelete: false, bothDeleted: false },
      };
    } else {
      messageBlock = {
        text,
        time: new Date(),
        status: { selfDelete: false, bothDeleted: false },
      };
    }

    const field = `${senderName}.${req.file ? "file" : "text"}`;

    await ChatRoom.findByIdAndUpdate(
      roomId,
      {
        $push: { [`messages.${field}`]: messageBlock },
        $set: {
          lastMessage: {
            text: text || req.file?.originalname || "",
            sender: senderName,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    );

    // Emit to receiver
    if (global._io) {
      global._io.to(receiverId).emit("newMessageReceived", {
        roomId,
        senderId,
        message: messageBlock,
      });
    }

    return res.json({
      type: req.file ? "file" : "text",
      ...messageBlock,
    });
  } catch (err) {
    console.error("Error sending message:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================
   6️⃣ GET ALL MESSAGES OF A ROOM
============================================================ */
router.get("/room_all_messages/:roomId", async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId).lean();
    if (!room) return res.status(404).json({ error: "Room not found" });

    const all = [];

    room.members.forEach((member) => {
      const username = member.name;
      const block = room.messages?.[username];

      if (!block) return;

      block.text?.forEach((msg) =>
        all.push({
          senderName: username,
          senderId: member._id,
          type: "text",
          ...msg,
        })
      );

      block.file?.forEach((msg) =>
        all.push({
          senderName: username,
          senderId: member._id,
          type: "file",
          ...msg,
        })
      );
    });

    all.sort((a, b) => new Date(a.time) - new Date(b.time));

    return res.json(all);
  } catch (err) {
    console.error("Error fetching messages:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
