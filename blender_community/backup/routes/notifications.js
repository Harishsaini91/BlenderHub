const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification_schema");
const User = require("../models/User");

// Helper to create entry
const createEntry = (user, status = "pending") => ({
  id: user._id,
  name: user.name,
  image: user.image,
  skills: user.skills || [],
  status,
  date: new Date(),
});

 

// RESPOND TO REQUEST (ACCEPT / REJECT)
router.post("/respond", async (req, res) => {
  try {
    const { userId, senderId, decision } = req.body;

    // Fetch both users' notification documents
    const receiverDoc = await Notification.findOne({ userId });
    const senderDoc = await Notification.findOne({ userId: senderId });

    if (!receiverDoc || !senderDoc) {
      return res.status(404).json({ error: "Notification documents not found" });
    }

    if (decision === "accepted") {
      // ✅ Update request status in both docs
      const rcvEntry = receiverDoc.connection.received.find(e => e.id.toString() === senderId);
      const sndEntry = senderDoc.connection.sent.find(e => e.id.toString() === userId);

      if (!rcvEntry || !sndEntry) {
        return res.status(404).json({ error: "Request entry not found." });
      }

      rcvEntry.status = "accepted";
      sndEntry.status = "accepted";

      await receiverDoc.save();
      await senderDoc.save();

      // ✅ Add each other as members
      const receiverUser = await User.findById(userId);
      const senderUser = await User.findById(senderId);

      const alreadyInReceiver = receiverUser.members.some(m => m._id.toString() === senderId);
      const alreadyInSender = senderUser.members.some(m => m._id.toString() === userId);

      if (!alreadyInReceiver) {
        receiverUser.members.push({ _id: senderId, name: senderUser.name, mutuals: [] });
        await receiverUser.save();
      }

      if (!alreadyInSender) {
        senderUser.members.push({ _id: userId, name: receiverUser.name, mutuals: [] });
        await senderUser.save();
      }

    } else if (decision === "rejected") {
      // ❌ Remove the request from both sides
      receiverDoc.connection.received = receiverDoc.connection.received.filter(
        (e) => e.id.toString() !== senderId
      );
      senderDoc.connection.sent = senderDoc.connection.sent.filter(
        (e) => e.id.toString() !== userId
      );

      await receiverDoc.save();
      await senderDoc.save();
    }

    res.json({ message: `Request ${decision}` });
  } catch (err) {
    console.error("❌ Error responding to request:", err.message);
    res.status(500).json({ error: err.message });
  }
});




// ==============================
// SEND CONNECTION REQUEST
// POST /api/notifications/send
// ==============================
router.post("/send", async (req, res) => {
  try {
    const { fromId, toId, type } = req.body;

    if (!fromId || !toId || !type)
      return res.status(400).json({ error: "Missing required fields" });

    const sender = await User.findById(fromId).select("name image");
    const receiver = await User.findById(toId).select("name image");
    if (!sender || !receiver) return res.status(404).json({ error: "Users not found" });

    // Fetch or create sender record
    let senderNotif = await Notification.findOne({ userId: fromId });
    if (!senderNotif) {
      senderNotif = await Notification.create({
        userId: fromId,
        name: sender.name,
        [type]: { sent: [createEntry(receiver)] },
      });
    } else {
      // Check for duplicate
      const exists = senderNotif[type]?.sent.some(
        (r) => r.id.toString() === toId && r.status === "pending"
      );
      if (exists) return res.status(409).json({ error: "Request already sent" });

      senderNotif[type].sent.push(createEntry(receiver));
      await senderNotif.save();
    }

    // Fetch or create receiver record
    let receiverNotif = await Notification.findOne({ userId: toId });
    if (!receiverNotif) {
      receiverNotif = await Notification.create({
        userId: toId,
        name: receiver.name,
        [type]: { received: [createEntry(sender)] },
      });
    } else {
      receiverNotif[type].received.push(createEntry(sender));
      await receiverNotif.save();
    }

    res.status(200).json({ message: "Request sent successfully" });
  } catch (err) {
    console.error("❌ Send Request Error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

 
router.get("/notifications/:userId", async (req, res) => {
  try {
    const data = await Notification.findOne({ userId: req.params.userId });

    if (!data) {
      return res.json({
        connection: { sent: [], received: [] },
        team: { sent: [], received: [] },
        challenge: { sent: [], received: [] },
      });
    }

    // Filter only 'pending' requests
    const filterPending = (list) => list?.filter((entry) => entry.status === "pending") || [];

    res.json({
      connection: {
        sent: filterPending(data.connection?.sent),
        received: filterPending(data.connection?.received),
      },
      team: {
        sent: filterPending(data.team?.sent),
        received: filterPending(data.team?.received),
      },
      challenge: {
        sent: filterPending(data.challenge?.sent),
        received: filterPending(data.challenge?.received),
      },
    });
  } catch (err) {
    console.error("❌ Fetch error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;