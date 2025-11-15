// server/routes/event_portal_router.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const shortid = require("shortid");
const mongoose = require("mongoose");
const Event = require("../models/Event_schema");
const User = require("../models/User") || require("../models/Users");
const { sendEmail } = require("../utils/emailService");
const authenticate = require("../middleware/auth");



// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "..", "uploads", "events");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${shortid.generate()}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

// ----------------------
// CREATE
// ----------------------
router.post("/create", authenticate, upload.array("media", 8), async (req, res) => {
  try {
    const files = (req.files || []).map((f) => ({
      url: `/uploads/events/${f.filename}`,
      filename: f.filename,
      type: f.mimetype?.startsWith("video") ? "video" : "image",
    }));

    const body = req.body || {};
    if (!body.name) return res.status(400).json({ success: false, message: "Event name required" });

    const eventLink = `${shortid.generate()}-${Date.now().toString(36)}`;
    const passkey = body.visibility === "private" ? body.passkey || shortid.generate() : null;

    const event = new Event({
      userId: req.user._id,
      username: req.user.name || req.user.username || "Unknown",
      name: body.name,
      description: body.description,
      rules: body.rules,
      prize: body.prize,
      level: body.level || "Other",
      contact: body.contact,
      email: body.email,
      exampleUrl: body.exampleUrl,
      media: files,
      startTime: body.startTime ? new Date(body.startTime) : null,
      endTime: body.endTime ? new Date(body.endTime) : null,
      visibility: body.visibility || "public",
      passkey,
      eventLink,
    });

    await event.save();

    // link to user (defensive)
    try {
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { events: event._id } });
    } catch (uerr) {
      console.warn("Could not link event to user:", uerr.message);
    }

    // socket notify
    if (global._io) {
      global._io.emit("newEventCreated", { eventId: event._id, eventName: event.name, username: event.username });
    }

    res.json({ success: true, event });
  } catch (err) {
    console.error("Create event error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------
// LIST (public board)
// ----------------------
router.get("/list", async (req, res) => {
  try {
    const now = new Date();
    const expiryDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // optional cleanup
    try {
      await Event.deleteMany({ endTime: { $lt: expiryDate } });
    } catch (e) {
      // ignore
    }

    const events = await Event.find({}).lean(); // include public and private in board (frontend will control passkey)
    // We'll still show all in board per your requirement; frontend handles passkey verification.
    // Sort: votes desc then createdAt desc
    const sorted = events.sort((a, b) => {
      const av = (a.votes && a.votes.length) || 0;
      const bv = (b.votes && b.votes.length) || 0;
      if (bv !== av) return bv - av;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({ success: true, events: sorted });
  } catch (err) {
    console.error("List events error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------
// MY EVENTS
// ----------------------
router.get("/mine", authenticate, async (req, res) => {
  try {
    const events = await Event.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, events });
  } catch (err) {
    console.error("Fetch my events error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ----------------------
// DETAIL (id or eventLink)
// ----------------------
router.get("/:idOrLink", async (req, res) => {
  try {
    const { idOrLink } = req.params;
    let event = null;

    if (/^[0-9a-fA-F]{24}$/.test(idOrLink)) {
      event = await Event.findById(idOrLink).populate("userId", "name email image").populate("comments.userId", "name image").lean();
    } else {
      event = await Event.findOne({ eventLink: idOrLink }).populate("userId", "name email image").populate("comments.userId", "name image").lean();
    }

    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    res.json({ success: true, event });
  } catch (err) {
    console.error("Get event error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------
// VERIFY PASSKEY
// POST /api/events/verify
// body: { eventIdOrLink, passkey }
// ----------------------
router.post("/verify", async (req, res) => {
  try {
    const { eventIdOrLink, passkey } = req.body;
    if (!eventIdOrLink) return res.status(400).json({ verified: false, message: "Missing event identifier" });

    let event = null;
    if (/^[0-9a-fA-F]{24}$/.test(eventIdOrLink)) {
      event = await Event.findById(eventIdOrLink).lean();
    } else {
      event = await Event.findOne({ eventLink: eventIdOrLink }).lean();
    }

    if (!event) return res.status(404).json({ verified: false, message: "Event not found" });

    const ok = event.visibility !== "private" || event.passkey === passkey;
    res.json({ verified: !!ok });
  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).json({ verified: false, message: err.message });
  }
});

// ----------------------
// UPDATE
// ----------------------
router.put("/update/:id", authenticate, upload.array("media", 8), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    const userId = req.user._id;
    const isCreator = String(event.userId) === String(userId);
    const providedPasskey = req.body.passkey;

    if (!isCreator && event.visibility === "private" && providedPasskey !== event.passkey) {
      return res.status(403).json({ success: false, message: "Unauthorized to edit" });
    }

    const newFiles = (req.files || []).map((f) => ({
      url: `/uploads/events/${f.filename}`,
      filename: f.filename,
      type: f.mimetype?.startsWith("video") ? "video" : "image",
    }));

    const allowed = ["name", "description", "rules", "prize", "level", "contact", "email", "exampleUrl", "visibility", "startTime", "endTime"];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) {
        event[key] = req.body[key];
      }
    });

    if (newFiles.length) event.media.push(...newFiles);
    await event.save();

    res.json({ success: true, event });
  } catch (err) {
    console.error("Update event error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------
// DELETE
// ----------------------
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    if (String(event.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Not authorized to delete" });
    }

    await event.deleteOne();
    try {
      await User.findByIdAndUpdate(req.user._id, { $pull: { events: event._id } });
    } catch (uerr) {
      console.warn("Could not remove event from user:", uerr.message);
    }

    res.json({ success: true, message: "Event deleted successfully" });
  } catch (err) {
    console.error("Delete event error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------
// SHARE
// ----------------------
router.post("/share", authenticate, async (req, res) => {
  try {
    const { eventId, receivers = [], message } = req.body;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    const eventLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/events/${event.eventLink || event._id}`;
    const passText = event.visibility === "private" ? `<p><b>Passkey:</b> ${event.passkey}</p>` : "";

    const sharedRecords = [];
    for (const r of receivers) {
      try {
        const userObj = r.id ? await User.findById(r.id).lean() : null;
        const emailTo = r.email || userObj?.email;

        event.sharedWith.push({ userId: r.id || null, email: emailTo, invitedBy: req.user._id, status: "pending", via: "email" });

        if (emailTo) {
          await sendEmail({
            to: emailTo,
            subject: `Invitation: ${event.name}`,
            html: `
              <p>Hello ${r.name || (userObj && userObj.name) || "friend"},</p>
              <p>You are invited to <b>${event.name}</b>.</p>
              ${passText}
              <p><a href="${eventLink}">View Event</a></p>
              <p>${message || ""}</p>
            `,
          }).catch((e) => console.error("Email send failed for", emailTo, e));
        }

        sharedRecords.push({ email: emailTo, userId: r.id || null });
      } catch (innerErr) {
        console.error("Error processing receiver", r, innerErr);
      }
    }

    await event.save();

    if (global._io) {
      for (const rec of sharedRecords) {
        if (rec.userId) {
          try {
            global._io.to(String(rec.userId)).emit("notification", { type: "event_shared", eventId: event._id, from: req.user._id });
          } catch (e) {
            console.warn("Socket emit failed:", e.message);
          }
        }
      }
    }

    res.json({ success: true, message: "Invites sent successfully" });
  } catch (err) {
    console.error("Share event error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------
// INTERACT (like, vote, remind, comment)
// POST /:id/interact
// body: { action: "like" | "vote" | "remind" | "comment", text?: string }
// ----------------------
router.post("/:id/interact", authenticate, async (req, res) => {
  try {
    const { action, text } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    const userId = req.user._id;

    if (action === "like") {
      const exists = event.likes.find((u) => String(u) === String(userId));
      if (exists) event.likes = event.likes.filter((u) => String(u) !== String(userId));
      else event.likes.push(userId);
    } else if (action === "vote") {
      const exists = event.votes.find((u) => String(u) === String(userId));
      if (exists) event.votes = event.votes.filter((u) => String(u) !== String(userId));
      else event.votes.push(userId);
    } else if (action === "remind") {
      const exists = event.reminders.find((u) => String(u) === String(userId));
      if (exists) event.reminders = event.reminders.filter((u) => String(u) !== String(userId));
      else event.reminders.push(userId);
    } else if (action === "comment") {
      if (!text || !text.trim()) return res.status(400).json({ success: false, message: "Comment text required" });
      event.comments.push({ userId: userId, username: req.user.name || req.user.username || "Unknown", text: text.trim() });
    } else {
      return res.status(400).json({ success: false, message: "Unknown action" });
    }

    await event.save();

    // Optionally emit socket event to room (event owner or subscribers)
    if (global._io) {
      try {
        global._io.emit("eventUpdated", { eventId: event._id, action });
      } catch (e) {
        // ignore
      }
    }

    res.json({ success: true, event });
  } catch (err) {
    console.error("Interact error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------
// SEARCH USERS
// ----------------------
router.post("/search-users", authenticate, async (req, res) => {
  try {
    const { searchTerm = "" } = req.body;
    const q = searchTerm.trim();
    if (!q) return res.json([]);

    const users = await User.find({
      $or: [{ name: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }],
    })
      .limit(20)
      .select("name email image")
      .lean();

    res.json(users);
  } catch (err) {
    console.error("Search users error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------
// CLEANUP
// ----------------------
router.delete("/cleanup", async (req, res) => {
  try {
    const expiry = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await Event.deleteMany({ endTime: { $lt: expiry } });
    res.json({ success: true, removed: result.deletedCount });
  } catch (err) {
    console.error("Cleanup error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// 
/* ==========================
   POST /api/events/search-users
   Body: { searchTerm, exclude }  // exclude = currentUserId (optional)
   Returns: [{ _id, name, email, image }]
   ========================== */

   
// router.post("/search-users", async (req, res) => {
//   try {
//     const { searchTerm = "", exclude } = req.body;
//     const q = searchTerm.trim();
//     if (!q) return res.json([]);

//     const query = { name: { $regex: q, $options: "i" } };
//     if (exclude) query._id = { $ne: exclude };

//     const users = await User.find(query)
//       .select("_id name email image")
//       .limit(40)
//       .lean();

//     res.json(users);
//   } catch (err) {
//     console.error("search-users error:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });

/* ==========================
   POST /api/events/share-to-users
   Body:
   {
     eventId,
     receivers: [{ id, email, name }],
     subject,
     message
   }
   Behavior:
   - validate event
   - for each receiver:
       - send email (using sendEmail)
       - push entry to notification document:
           - sender: added to senderDoc.event.sent
           - receiver: added to receiverDoc.event.received
       - push to event.sharedWith
   - return counts
   ========================== */
router.post("/share-to-users", authenticate, async (req, res) => {
  try {
    const { eventId, receivers = [], subject, message } = req.body;
    if (!eventId || !Array.isArray(receivers) || receivers.length === 0) {
      return res.status(400).json({ success: false, message: "Missing payload" });
    }

    const event = await Event.findById(eventId).lean();
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    // prepare some sender info from req.user
    const sender = {
      id: req.user._id,
      name: req.user.name || req.user.username || "Unknown",
      email: req.user.email || req.user?.email || "",
      image: req.user.image || "",
    };

    const frontendBase = process.env.FRONTEND_URL || "http://localhost:3000";
    const eventLink = `${frontendBase}/events/${event.eventLink || event._id}`;

    let sentCount = 0;
    for (const r of receivers) {
      try {
        // resolve receiver user doc if id provided
        let receiverUser = null;
        if (r.id) {
          receiverUser = await User.findById(r.id).select("_id name email image").lean();
        }

        const receiver = {
          id: r.id || null,
          name: r.name || (receiverUser && receiverUser.name) || r.email || "Guest",
          email: r.email || (receiverUser && receiverUser.email) || "",
          image: (receiverUser && receiverUser.image) || "",
        };

        // 1) send email (fire-and-forget non-blocking but await to catch error)
        const html = `
          <p>Hello ${receiver.name},</p>
          <p>${message || ""}</p>
          <p><b>Event:</b> ${event.name}</p>
          ${event.visibility === "private" ? `<p><b>Passkey:</b> ${event.passkey || "Provided by creator"}</p>` : ""}
          <p><a href="${eventLink}">Open Event</a></p>
          <p>From: ${sender.name} (${sender.email})</p>
        `;

        // attempt to send email if receiver has email
        if (receiver.email) {
          try {
            await sendEmail({
              to: receiver.email,
              subject: subject || `Invitation: ${event.name}`,
              html,
            });
          } catch (mailErr) {
            console.warn("Email send failed for", receiver.email, mailErr.message);
            // continue, we still save notification
          }
        }

        // 2) Save notifications to both sender and receiver
        // senderDoc.event.sent push
        const senderDoc = await Notification.findOneAndUpdate(
          { userId: sender.id },
          { $setOnInsert: { userId: sender.id, name: sender.name } },
          { upsert: true, new: true }
        );

        const senderEntry = {
          id: receiver.id || receiver.email || null,
          senderId: sender.id,
          senderName: sender.name,
          senderImage: sender.image,
          receiverId: receiver.id || null,
          receiverName: receiver.name,
          receiverImage: receiver.image,
          eventId: event._id,
          eventName: event.name,
          eventDescription: event.description || "",
          link: eventLink,
          passkey: event.visibility === "private" ? event.passkey : null,
          status: "pending",
          date: new Date(),
        };

        senderDoc.event = senderDoc.event || { sent: [], received: [] };
        senderDoc.event.sent.push(senderEntry);
        await senderDoc.save();

        // receiverDoc.event.received push
        if (receiver.id) {
          const receiverDoc = await Notification.findOneAndUpdate(
            { userId: receiver.id },
            { $setOnInsert: { userId: receiver.id, name: receiver.name } },
            { upsert: true, new: true }
          );

          const receiverEntry = {
            id: sender.id, // for received entries id points to sender
            senderId: sender.id,
            senderName: sender.name,
            senderImage: sender.image,
            receiverId: receiver.id,
            receiverName: receiver.name,
            receiverImage: receiver.image,
            eventId: event._id,
            eventName: event.name,
            eventDescription: event.description || "",
            link: eventLink,
            passkey: event.visibility === "private" ? event.passkey : null,
            status: "pending",
            date: new Date(),
          };

          receiverDoc.event = receiverDoc.event || { sent: [], received: [] };
          receiverDoc.event.received.push(receiverEntry);
          await receiverDoc.save();

          // Emit socket notification to receiver if io available
          if (global._io && receiver.id) {
            try {
              global._io.to(String(receiver.id)).emit("notification", {
                type: "event_invite",
                from: sender.id,
                eventId: event._id,
                eventName: event.name,
              });
            } catch (e) {
              console.warn("Socket emit failed:", e.message);
            }
          }
        }

        // 3) Save to event.sharedWith (one record per receiver)
        const sharedObj = {
          userId: receiver.id || null,
          email: receiver.email || "",
          invitedBy: sender.id,
          status: "pending",
          sharedAt: new Date(),
          via: "email",
        };

        await Event.findByIdAndUpdate(event._id, { $addToSet: { sharedWith: sharedObj } });

        sentCount++;
      } catch (innerErr) {
        console.error("Error processing receiver entry", innerErr);
        // continue to next receiver
      }
    } // end for each receiver

    res.json({ success: true, sent: sentCount });
  } catch (err) {
    console.error("share-to-users error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


module.exports = router;
