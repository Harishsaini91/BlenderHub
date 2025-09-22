// routes/chatRouter.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const ChatRoom = require("../models/ChatRoom_schema");
const User = require("../models/User");

const router = express.Router();

// File upload setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "uploads/chat_files";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + path.extname(file.originalname);
    cb(null, file.fieldname + "-" + unique);
  },
});
const upload = multer({ storage });

// 1. Get all connected members for the current user
router.get("/members/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate({
      path: "members._id",
      select: "name image",
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    const members = user.members.map((member) => {
      const userRef = member._id;
      return {
        _id: userRef._id,
        name: userRef.name,
        image: userRef.image || null,
      };
    });

    res.json(members);
  } catch (err) {
    console.error("Error fetching members:", err.message);
    res.status(500).json({ message: "Error fetching members", error: err.message });
  }
});

// 2. Create or get existing chat room
router.post("/room", async (req, res) => {
  const { userId, username, otherId, othername } = req.body;
  try {
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

    res.status(200).json(room);
  } catch (err) {
    console.error("Error creating/finding room:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ POST message to a room (text or file)
router.post("/message/:roomId", upload.single("file"), async (req, res) => {
  try {
    const { roomId } = req.params;
    const { senderId, senderName, text } = req.body;

    const room = await ChatRoom.findById(roomId);
    if (!room) return res.status(404).json({ error: "Room not found" });

    const receiver = room.members.find(m => m._id.toString() !== senderId);
    const receiverId = receiver?._id?.toString(); // for emitting to receiver
    const receiverName = receiver?.name;

    const messageEntry = {
      time: new Date(),
      status: { selfDelete: false, bothDelete: false },
    };

    if (text) messageEntry.text = text;
    if (req.file) {
      messageEntry.fileUrl = `/uploads/chat_files/${req.file.filename}`;
      messageEntry.fileName = req.file.originalname;
      messageEntry.fileType = req.file.mimetype;
    }

    const userField = `${senderName}.${req.file ? "file" : "text"}`;
    const update = {
      $push: { [`messages.${userField}`]: messageEntry },
      $set: {
        lastMessage: {
          text: text || req.file?.originalname || "",
          sender: senderName,
          createdAt: new Date(),
        },
      },
    };

    const updatedRoom = await ChatRoom.findByIdAndUpdate(roomId, update, { new: true });

    // ✅ Emit real-time update to the receiver via Socket.IO
    if (receiverId && global._io) {
      global._io.to(receiverId).emit("newMessageReceived", {
        roomId,
        senderId,
        message: messageEntry,
      });
    }

    res.status(201).json({
      user: senderName,
      type: req.file ? "file" : "text",
      ...messageEntry,
    });

  } catch (err) {
    console.error("Error sending message:", err.message);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// 4. Get all grouped messages of a room
// router.get("/room_all_messages/:roomId", async (req, res) => {
//   try {
//     const room = await ChatRoom.findById(req.params.roomId);
//     if (!room) return res.status(404).json({ error: "Room not found" });

//     res.json(room.messages || {});
//   } catch (err) {
//     console.error("Error fetching messages:", err.message);
//     res.status(500).json({ error: "Failed to fetch messages" });
//   }
// });


router.get("/room_all_messages/:roomId", async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId);
    if (!room) return res.status(404).json({ error: "Room not found" });

    const allMessages = [];

    if (room.members?.length) {
      room.members.forEach((member) => {
        const username = member.name; // e.g., "Harish Saini"

        // ✅ Use .get() because room.messages is a Map
        const userMessages = room.messages.get(username);

        console.log(`Messages for ${username}:`);

        if (userMessages) {
          const textMessages = userMessages.text || [];
          const fileMessages = userMessages.file || [];

          console.log("Text Messages:", textMessages);
          console.log("File Messages:", fileMessages);

          textMessages.forEach((msg) => {
            allMessages.push({
              senderName: username,
              senderId: member._id.toString(),
              type: "text",
              ...msg,
            });
          });

          fileMessages.forEach((msg) => {
            allMessages.push({
              senderName: username,
              senderId: member._id.toString(),
              type: "file",
              ...msg,
            });
          });
        } else {
          console.log("No messages found.");
        }
      });
    }

    allMessages.sort((a, b) => new Date(a.time) - new Date(b.time));
    res.json(allMessages);
  } catch (err) {
    console.error("❌ Error fetching messages:", err.message);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

 

router.get("/user-rooms/:userId", async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.params.userId);

    const rooms = await ChatRoom.find({
      "members._id": userId,
    }).lean(); // add lean to ensure plain objects

    // manually enrich each member with user data
    const userIds = [...new Set(rooms.flatMap(r => r.members.map(m => m._id.toString())))];

    const userDocs = await User.find({ _id: { $in: userIds } }, "name image isOnline").lean();
    const userMap = Object.fromEntries(userDocs.map(u => [u._id.toString(), u]));

    const enrichedRooms = rooms.map(room => ({
      ...room,
      members: room.members.map(m => ({
        ...userMap[m._id.toString()],
        _id: m._id
      })),
    }));

    res.json(enrichedRooms);
  } catch (err) {
    console.error("Error fetching user rooms:", err.message);
    res.status(500).json({ error: "Failed to fetch chat rooms" });
  }
});



module.exports = router;
