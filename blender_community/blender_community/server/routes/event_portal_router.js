// server/routes/event_portal_router.js
// Full-featured events router: create / list / mine / detail / verify / update / delete
// interact (like/vote/remind/comment) / search-users / share / share-to-users / shared-status / cleanup

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const shortid = require("shortid");
const mongoose = require("mongoose");

const Event = require("../models/Event_schema");

// Defensive require for User model (User or Users)
let User;
try {
  User = require("../models/User");
} catch (e1) {
  try {
    User = require("../models/Users");
  } catch (e2) {
    User = null;
    console.warn("Warning: User model not found at ../models/User or ../models/Users");
  }
}

const Notification = require("../models/Notification_schema");
const { sendEmail } = require("../utils/emailService");
const authenticate = require("../middleware/auth");

// --------------------
// Multer storage config
// --------------------
const uploadDir = path.join(__dirname, "..", "uploads", "events");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    cb(null, `${Date.now()}-${shortid.generate()}${ext}`);
  },
});
const upload = multer({ storage });

// --------------------
// Helpers
// --------------------
function buildEventPublicUrl(event) {
  const frontendBase = process.env.FRONTEND_URL || "http://localhost:3000";
  return `${frontendBase}/events/${event.eventLink || event._id}`;
}

async function ensureNotificationDocForUser(userId, name) {
  if (!userId) return null;
  const doc = await Notification.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, name: name || "Unknown" } },
    { upsert: true, new: true }
  );
  return doc;
}

// safeAddToSharedWith: uses $addToSet with object equality by fields if possible
async function addSharedWith(eventId, sharedObj) {
  try {
    // Use $addToSet with the object. Mongo compares full object; to avoid duplicates better to push then dedupe.
    await Event.findByIdAndUpdate(eventId, { $addToSet: { sharedWith: sharedObj } });
  } catch (err) {
    console.warn("addSharedWith failed:", err.message);
  }
}

// --------------------
// ROUTES
// --------------------

/*
  CREATE EVENT
  POST /api/events/create
  auth required
  multipart/form-data with media files (field name: 'media')
*/
router.post("/create", authenticate, upload.array("media", 12), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.name || body.name.trim() === "")
      return res.status(400).json({ success: false, message: "Event name required" });

    const files = (req.files || []).map((f) => ({
      url: `/uploads/events/${f.filename}`,
      filename: f.filename,
      type: (f.mimetype || "").includes("video") ? "video" : "image",
    }));

    const eventLink = `${shortid.generate()}-${Date.now().toString(36)}`;
    const passkey = body.visibility === "private" ? body.passkey || shortid.generate() : null;

    const event = new Event({
      userId: req.user._id,
      username: req.user.name || req.user.username || "Unknown",
      email: body.email || req.user.email || "",
      contact: body.contact || "",
      name: body.name,
      description: body.description || "",
      rules: body.rules || "",
      prize: body.prize || "",
      level: body.level || "Other",
      exampleUrl: body.exampleUrl || "",
      media: files,
      startTime: body.startTime ? new Date(body.startTime) : null,
      endTime: body.endTime ? new Date(body.endTime) : null,
      visibility: body.visibility || "public",
      passkey,
      eventLink,
    });

    await event.save();

    // link to user if model exists
    if (User) {
      try {
        await User.findByIdAndUpdate(req.user._id, { $addToSet: { events: event._id } });
      } catch (uerr) {
        console.warn("Could not link event to user:", uerr.message);
      }
    }

    // socket notify
    if (global._io) {
      try {
        global._io.emit("newEventCreated", { eventId: event._id, eventName: event.name, username: event.username });
      } catch (e) {}
    }

    return res.json({ success: true, event });
  } catch (err) {
    console.error("Create event error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// /*
//   LIST public board
//   GET /api/events/list
//   optional: frontend decides visibility UX; we return all events (could filter later)
// */
// router.get("/list", async (req, res) => {
//   try {
//     // Non-blocking cleanup of expired events (older than 24 hours past endTime)
//     const now = new Date();
//     const expiryDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
//     Event.deleteMany({ endTime: { $lt: expiryDate } }).catch(() => {});

//     const events = await Event.find({}).lean();

//     // sort by votes desc then createdAt desc
//     const sorted = events.sort((a, b) => {
//       const av = (a.votes && a.votes.length) || 0;
//       const bv = (b.votes && b.votes.length) || 0;
//       if (bv !== av) return bv - av;
//       return new Date(b.createdAt) - new Date(a.createdAt);
//     });

//     return res.json({ success: true, events: sorted });
//   } catch (err) {
//     console.error("List events error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// });

/*
  LIST public board
  GET /api/events/list
*/
router.get("/list", async (req, res) => {
  try {
    // Cleanup old events (non-blocking)
    const now = new Date();
    const expiryDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    Event.deleteMany({ endTime: { $lt: expiryDate } }).catch(() => {});

    const events = await Event.find({}).lean();

    // SAFE: treat likes/votes as numbers
    const sorted = events.sort((a, b) => {
      const av = typeof a.votes === "number" ? a.votes : 0;
      const bv = typeof b.votes === "number" ? b.votes : 0;

      if (bv !== av) return bv - av;

      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return res.json({ success: true, events: sorted });

  } catch (err) {
    console.error("List events error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});


/*
  MY EVENTS
  GET /api/events/mine
  auth required
*/
router.get("/mine", authenticate, async (req, res) => {
  try {
    const events = await Event.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, events });
  } catch (err) {
    console.error("Fetch my events error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/*
  DETAIL by id or eventLink
  GET /api/events/:idOrLink
  public
*/
// router.get("/:idOrLink", async (req, res) => {
//   try {
//     const { idOrLink } = req.params;
//     let event = null;
//     if (/^[0-9a-fA-F]{24}$/.test(idOrLink)) {
//       event = await Event.findById(idOrLink)
//         .populate("userId", "name email image")
//         .populate("comments.userId", "name image")
//         .lean();
//     } else {
//       event = await Event.findOne({ eventLink: idOrLink })
//         .populate("userId", "name email image")
//         .populate("comments.userId", "name image")
//         .lean();
//     }

//     if (!event) return res.status(404).json({ success: false, message: "Event not found" });
//     return res.json({ success: true, event });
//   } catch (err) {
//     console.error("Get event error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// });


// SECURE GET EVENT (supports preview mode)
router.get("/:idOrLink", async (req, res) => {
  try {
    const { idOrLink } = req.params;

    const passkey = req.query.passkey || null;
    const preview = req.query.preview === "true";   // 👈 NEW
    const userId = req.user ? String(req.user._id) : null;

    let event = null;

    // Find by ID or eventLink
    if (/^[0-9a-fA-F]{24}$/.test(idOrLink)) {
      event = await Event.findById(idOrLink).lean();
    } else {
      event = await Event.findOne({ eventLink: idOrLink }).lean();
    }

    if (!event) {
      return res.json({ success: false, message: "Event not found" });
    }

    const ownerId = String(event.userId);

    /* 
      ===========================
      🔐 PRIVATE EVENT PROTECTION
      ===========================
      - If event is private
      - AND user is not owner
      - AND NOT preview mode
      → Require passkey
    */

    if (event.visibility === "private" && !preview && userId !== ownerId) {
      if (!passkey || passkey !== event.passkey) {
        return res.json({
          success: false,
          requirePasskey: true,
          message: "Passkey required",
        });
      }
    }

    return res.json({ success: true, event });

  } catch (err) {
    console.error("Private event error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
});




/*
  VERIFY PASSKEY
  POST /api/events/verify
  body: { eventIdOrLink, passkey }
*/
router.post("/verify", async (req, res) => {
  try {
    const { eventIdOrLink, passkey } = req.body || {};
    if (!eventIdOrLink) return res.status(400).json({ verified: false, message: "Missing event identifier" });

    let event = null;
    if (/^[0-9a-fA-F]{24}$/.test(eventIdOrLink)) event = await Event.findById(eventIdOrLink).lean();
    else event = await Event.findOne({ eventLink: eventIdOrLink }).lean();

    if (!event) return res.status(404).json({ verified: false, message: "Event not found" });

    const ok = event.visibility !== "private" || event.passkey === passkey;
    return res.json({ verified: !!ok });
  } catch (err) {
    console.error("Verify error:", err);
    return res.status(500).json({ verified: false, message: err.message });
  }
});

/*
  UPDATE
  PUT /api/events/update/:id
  auth required - only creator may update
  accepts multipart media
*/
router.put("/update/:id", authenticate, upload.array("media", 12), async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    // Only owner can update
    if (String(event.userId) !== String(req.user._id)) return res.status(403).json({ success: false, message: "Unauthorized" });

    // Accept a set of allowed fields; only update if provided (non-undefined)
    const allowed = [
      "name",
      "description",
      "rules",
      "prize",
      "level",
      "contact",
      "email",
      "exampleUrl",
      "startTime",
      "endTime",
      "visibility",
      "passkey",
    ];

    const update = {};
    for (const k of allowed) {
      if (typeof req.body[k] !== "undefined") {
        if ((k === "startTime" || k === "endTime") && req.body[k]) update[k] = new Date(req.body[k]);
        else update[k] = req.body[k];
      }
    }

    // Handle new uploaded media
    if (req.files && req.files.length > 0) {
      const media = req.files.map((f) => ({ url: `/uploads/events/${f.filename}`, filename: f.filename, type: (f.mimetype || "").includes("video") ? "video" : "image" }));
      // we'll push new media items
      update.$push = { media: { $each: media } };
    }

    const updated = await Event.findByIdAndUpdate(eventId, update, { new: true });
    return res.json({ success: true, event: updated });
  } catch (err) {
    console.error("Update error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/*
  DELETE
  DELETE /api/events/:id
  auth required
  only creator may delete
*/
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    if (String(event.userId) !== String(req.user._id)) return res.status(403).json({ success: false, message: "Unauthorized" });

    // remove event doc
    await Event.findByIdAndDelete(eventId);

    // Optionally remove reference from User.events
    if (User) {
      try {
        await User.findByIdAndUpdate(req.user._id, { $pull: { events: eventId } });
      } catch (uerr) {
        console.warn("Could not remove event id from user.events:", uerr.message);
      }
    }

    return res.json({ success: true, message: "Event deleted" });
  } catch (err) {
    console.error("Delete event error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});
 
/*
  SEARCH USERS by name/email -- used by share UI
  POST /api/events/search-users
  auth required
*/
router.post("/search-users", authenticate, async (req, res) => {
  try {
    const { searchTerm = "", exclude } = req.body || {};
    const q = (searchTerm || "").trim();
    if (!q) return res.json([]);

    const or = [{ name: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }];
    const filter = { $or: or };
    if (exclude) {
      try {
        filter._id = { $ne: mongoose.Types.ObjectId(exclude) };
      } catch (e) {
        // ignore invalid exclude id
      }
    }

    const users = await User.find(filter).limit(40).select("_id name email image").lean();
    return res.json(users);
  } catch (err) {
    console.error("Search users error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/*
  SHARE handling (internal function)
  Accepts: eventId, receivers: [{ id, email, name }], subject, message
  Responsibilities:
    - send emails (if email configured)
    - save sender notification (senderDoc.event.sent)
    - save receiver notification (receiverDoc.event.received) if receiver is a registered user
    - update Event.sharedWith with invited info
    - emit socket notification to receiver if connected
*/
async function handleShare(req, res, useReqUser = true) {
  try {
    const { eventId, receivers = [], subject, message } = req.body || {};
    if (!eventId || !Array.isArray(receivers) || receivers.length === 0) return res.status(400).json({ success: false, message: "Missing payload" });

    const event = await Event.findById(eventId).lean();
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    // sender details
    const sender = useReqUser && req.user
      ? { id: req.user._id, name: req.user.name || req.user.username || "Unknown", email: req.user.email || "", image: req.user.image || "" }
      : (req.body.sender || { id: null, name: "Unknown", email: "", image: "" });

    const eventLink = buildEventPublicUrl(event);

    const processed = [];
    let sentCount = 0;

    for (const r of receivers) {
      try {
        let receiverUser = null;
        if (r.id && User) {
          try {
            receiverUser = await User.findById(r.id).select("_id name email image").lean();
          } catch (err) {
            // invalid id, ignore
          }
        }

        const receiver = {
          id: r.id || (receiverUser && receiverUser._id) || null,
          name: r.name || (receiverUser && receiverUser.name) || (r.email || "Guest"),
          email: r.email || (receiverUser && receiverUser.email) || "",
          image: (receiverUser && receiverUser.image) || "",
        };

        // build email HTML body
        const html = `
          <p>Hello ${receiver.name},</p>
          <p>${(message || "").replace(/\n/g, "<br />")}</p>
          <p><strong>Event:</strong> ${event.name}</p>
          ${event.visibility === "private" ? `<p><strong>Passkey:</strong> ${event.passkey || "Provided by creator"}</p>` : ""}
          <p><a href=\"${eventLink}\">Open Event</a></p>
          <hr />
          <p>Sent by: ${sender.name} ${sender.email ? `(${sender.email})` : ""}</p>
        `;

        // Try sending email if receiver.email present
        if (receiver.email) {
          try {
            await sendEmail({ to: receiver.email, subject: subject || `Invitation: ${event.name}`, html });
          } catch (mailErr) {
            console.warn("Email send failed for", receiver.email, mailErr && mailErr.message ? mailErr.message : mailErr);
            // continue; email failure shouldn't block notifications
          }
        }

        // Save sender notification doc (store as 'event.sent')
        if (sender && sender.id) {
          const senderDoc = await ensureNotificationDocForUser(sender.id, sender.name);
          if (senderDoc) {
            senderDoc.event = senderDoc.event || { sent: [], received: [] };
            senderDoc.event.sent.push({
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
            });
            try { await senderDoc.save(); } catch (e) { console.warn("senderDoc save failed", e.message); }
          }
        }

        // Save receiver notification doc (if registered user)
        if (receiver.id) {
          const rdoc = await ensureNotificationDocForUser(receiver.id, receiver.name);
          if (rdoc) {
            rdoc.event = rdoc.event || { sent: [], received: [] };
            rdoc.event.received.push({
              id: sender.id || null,
              senderId: sender.id || null,
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
            });
            try { await rdoc.save(); } catch (e) { console.warn("receiverDoc save failed", e.message); }

            // socket notify
            if (global._io) {
              try {
                global._io.to(String(receiver.id)).emit("notification", { type: "event_invite", from: sender.id, eventId: event._id, eventName: event.name });
              } catch (e) {}
            }
          }
        }

        // Add to Event.sharedWith (avoid duplicates using $addToSet)
        const sharedObj = { userId: receiver.id || null, email: receiver.email || "", invitedBy: sender.id || null, status: "pending", sharedAt: new Date(), via: receiver.email ? "email" : "notification" };
        await addSharedWith(event._id, sharedObj);

        processed.push({ receiver, shared: true });
        sentCount++;
      } catch (inner) {
        console.error("Error processing receiver entry", inner);
        processed.push({ receiver: r, shared: false, error: inner.message || String(inner) });
      }
    }

    return res.json({ success: true, sent: sentCount, processed });
  } catch (err) {
    console.error("handleShare error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Legacy share endpoint (keeps backward compatibility)
router.post("/share", authenticate, async (req, res) => handleShare(req, res, true));
// New share endpoint with same behavior
router.post("/share-to-users", authenticate, async (req, res) => handleShare(req, res, true));

/*
  SHARED STATUS
  GET /api/events/shared-status/:eventId/:senderId
  returns array of already invited ids/emails
*/
router.get("/shared-status/:eventId/:senderId", authenticate, async (req, res) => {
  try {
    const { eventId, senderId } = req.params;
    if (!eventId || !senderId) return res.status(400).json({ success: false, message: "Missing params" });

    const event = await Event.findById(eventId).lean();
    const fromEvent = (event?.sharedWith || []).map((s) => (s.userId ? String(s.userId) : (s.email || "").toLowerCase()));

    const senderDoc = await Notification.findOne({ userId: senderId }).lean();
    const fromNotif = (senderDoc?.event?.sent || []).map((e) => (e.receiverId ? String(e.receiverId) : (e.id ? String(e.id) : (e.receiverName || ""))));

    const combined = new Set([...fromEvent.map(String), ...fromNotif.map(String)]);
    return res.json({ success: true, alreadySent: Array.from(combined) });
  } catch (err) {
    console.error("shared-status error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/*
  CLEANUP
  DELETE /api/events/cleanup
  deletes events with endTime < (now - 24h)
*/
router.delete("/cleanup", async (req, res) => {
  try {
    const expiry = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await Event.deleteMany({ endTime: { $lt: expiry } });
    return res.json({ success: true, removed: result.deletedCount });
  } catch (err) {
    console.error("Cleanup error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});


 


// ---------------------------------------------
// INTERACT (like, vote, remind, comment)
// POST /api/events/:id/interact
// ---------------------------------------------
router.post("/:id/interact", authenticate, async (req, res) => {
  try {
    const { action, text } = req.body || {};
    const eventId = req.params.id;

    // 1. Fetch event
    const event = await Event.findById(eventId);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    const userId = req.user._id.toString();

    // Ensure numbers exist
    if (typeof event.likes !== "number") event.likes = 0;
    if (typeof event.votes !== "number") event.votes = 0;

    // Ensure arrays exist
    if (!Array.isArray(event.likedUsers)) event.likedUsers = [];
    if (!Array.isArray(event.votedUsers)) event.votedUsers = [];
    if (!Array.isArray(event.reminders)) event.reminders = [];
    if (!Array.isArray(event.comments)) event.comments = [];

    /* ---------------------------------------------------
       ❤️ LIKE / UNLIKE
    --------------------------------------------------- */
    if (action === "like") {
      const already = event.likedUsers.some(
        (id) => id.toString() === userId
      );

      if (already) {
        // UNLIKE
        event.likedUsers = event.likedUsers.filter(
          (id) => id.toString() !== userId
        );
        event.likes = Math.max(0, event.likes - 1);
      } else {
        // LIKE
        event.likedUsers.push(userId);
        event.likes += 1;
      }
    }

    /* ---------------------------------------------------
       ⬆️ VOTE / UNVOTE
    --------------------------------------------------- */
    else if (action === "vote") {
      const already = event.votedUsers.some(
        (id) => id.toString() === userId
      );

      if (already) {
        // REMOVE VOTE
        event.votedUsers = event.votedUsers.filter(
          (id) => id.toString() !== userId
        );
        event.votes = Math.max(0, event.votes - 1);
      } else {
        // ADD VOTE
        event.votedUsers.push(userId);
        event.votes += 1;
      }
    }

    /* ---------------------------------------------------
       🔔 REMIND / UNREMIND
    --------------------------------------------------- */
    else if (action === "remind") {
      const already = event.reminders.some(
        (id) => id.toString() === userId
      );

      if (already) {
        event.reminders = event.reminders.filter(
          (id) => id.toString() !== userId
        );
      } else {
        event.reminders.push(userId);
      }
    }

    /* ---------------------------------------------------
       💬 COMMENT
    --------------------------------------------------- */
    else if (action === "comment") {
      if (!text || !text.trim()) {
        return res
          .status(400)
          .json({ success: false, message: "Comment text required" });
      }

      event.comments.push({
        userId,
        username: req.user.name || req.user.username || "Unknown User",
        text: text.trim(),
        createdAt: new Date(),
      });
    }

    /* ---------------------------------------------------
       ❌ Unknown action
    --------------------------------------------------- */
    else {
      return res
        .status(400)
        .json({ success: false, message: "Unknown action" });
    }

    // Save final updated event
    await event.save();

    // Optional: Notify socket listeners
    if (global._io) {
      try {
        global._io.emit("eventUpdated", { eventId: event._id, action });
      } catch {}
    }

    return res.json({ success: true, event });

  } catch (err) {
    console.error("Interact error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
});


// PARTICIPATE IN EVENT
// POST /api/events/:id/participate
router.post("/:id/participate", authenticate, async (req, res) => {
  try {
    const eventId = req.params.id;
    const { name, email, phone, portfolio, skill } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    // prevent duplicate participation
    if (event.participants.some(p => String(p.userId) === String(req.user._id))) {
      return res.json({ success: false, message: "You already participated" });
    }

    const participant = {
      userId: req.user._id,
      name,
      email,
      phone,
      portfolio,
      skill,
      submittedAt: new Date(),
    };

    event.participants.push(participant);
    await event.save();

    return res.json({ success: true, message: "Participation submitted", participant });
  } catch (err) {
    console.error("Participation error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



router.post("/:id/participate/start", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.json({ success: false, message: "Email required" });

    const event = await Event.findById(req.params.id);
    if (!event) return res.json({ success: false, message: "Event not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // check existing participant
    let participant = event.participants.find(p => p.email === email);

    if (!participant) {
      participant = { email, otp, emailVerified: false };
      event.participants.push(participant);
    } else {
      participant.otp = otp;
      participant.emailVerified = false;
    }

    await event.save();

    // send OTP email
    await sendEmail({
      to: email,
      subject: "Verify your email",
      html: `<p>Your verification code is <b>${otp}</b></p>`
    });

    return res.json({
      success: true,
      message: "OTP sent",
      email
    });

  } catch (err) {
    console.error("OTP error:", err);
    return res.json({ success: false, message: "Server error" });
  }
});


router.post("/:id/participate/verify", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const event = await Event.findById(req.params.id);
    if (!event) return res.json({ success: false, message: "Event not found" });

    const participant = event.participants.find(p => p.email === email);
    if (!participant) return res.json({ success: false, message: "Email not started" });

    if (participant.otp !== otp)
      return res.json({ success: false, message: "Incorrect OTP" });

    participant.emailVerified = true;
    participant.otp = null;

    await event.save();

    return res.json({
      success: true,
      message: "Email verified",
      participant
    });

  } catch (err) {
    return res.json({ success: false, message: "Server error" });
  }
});



router.post("/:id/participate/save", async (req, res) => {
  try {
    const { email, name, phone, portfolio, skill } = req.body;

    const event = await Event.findById(req.params.id);
    if (!event) return res.json({ success: false, message: "Event not found" });

    let participant = event.participants.find(p => p.email === email);

    if (!participant)
      return res.json({ success: false, message: "Email not verified" });

    if (!participant.emailVerified)
      return res.json({ success: false, message: "Email not verified" });

    // update values
    participant.name = name;
    participant.phone = phone;
    participant.portfolio = portfolio;
    participant.skill = skill;
    participant.updatedAt = new Date();

    await event.save();

    return res.json({
      success: true,
      message: "Response saved",
      participant
    });

  } catch (err) {
    console.error("Participation save error:", err);
    return res.json({ success: false, message: "Server error" });
  }
});



module.exports = router;
