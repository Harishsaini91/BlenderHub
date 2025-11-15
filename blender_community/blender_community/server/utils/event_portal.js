// server/routes/event_portal.js
require("dotenv").config();
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const Event = require("../models/Event_schema");
const { sendEmail } = require("../utils/emailService");

// ⚙️ Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/events");
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + ext);
  },
});
const upload = multer({ storage });

// ✅ Create new event
router.post("/create", upload.array("media", 8), async (req, res) => {
  try {
    const { userId, username, name, description, rules, prize, level, contact, email, exampleUrl, startTime, endTime } = req.body;

    const media = (req.files || []).map(file => ({
      url: `/uploads/events/${file.filename}`,
      filename: file.filename,
      type: file.mimetype.startsWith("video") ? "video" : "image",
    }));

    const event = new Event({
      userId: new mongoose.Types.ObjectId(userId),
      username,
      name,
      description,
      rules,
      prize,
      level,
      contact,
      email,
      exampleUrl,
      startTime,
      endTime,
      media,
      visibility: "public",
    });

    await event.save();

    // 🎯 Emit notification (Socket.IO)
    if (global._io) {
      global._io.emit("newEventCreated", {
        eventId: event._id,
        eventName: event.name,
        username: event.username,
      });
    }

    // 📧 Optional: Send email confirmation to host
    if (email) {
      const html = `
        <h2>Event Created Successfully</h2>
        <p>Hi ${username},</p>
        <p>Your event <strong>${name}</strong> has been created successfully on BlenderHub.</p>
        <p><a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/events/${event._id}">View Event</a></p>
      `;
      sendEmail(email, "Event Created Successfully 🎉", html);
    }

    res.status(201).json({ success: true, message: "Event created successfully", event });
  } catch (err) {
    console.error("❌ Event creation error:", err);
    res.status(500).json({ success: false, message: "Server error while creating event." });
  }
});

// ✅ Fetch all events
router.get("/list", async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error fetching events" });
  }
});

// ✅ Fetch single event by ID
router.get("/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    res.status(200).json({ success: true, event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error fetching event" });
  }
});

module.exports = router;
