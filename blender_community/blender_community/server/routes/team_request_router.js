const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Notification = require("../models/Notification_schema");

const createEntry = (user, status = "pending") => ({
  id: user._id,
  name: user.name,
  image: user.image,
  skills: user.skills || [],
  status,
  date: new Date(),
});

// POST /api/team/send
router.post("/send", async (req, res) => {
  try {
    const { from, fromName, fromImage, fromSkills, to, toName, toImage } = req.body;

    if (!from || !to || !fromName || !toName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ Check if `to` is already connected to `from`
    const senderUser = await User.findById(from);
    const isConnected = senderUser?.members?.some((m) => m._id.toString() === to);

    if (!isConnected) {
      return res.status(403).json({ error: "You can only invite connected members to a team" });
    }

    // 🔽 Create data to push
    const senderEntry = createEntry({ _id: to, name: toName, image: toImage });
    const receiverEntry = createEntry({ _id: from, name: fromName, image: fromImage, skills: fromSkills });

    // ✅ Sender Document
    let senderNotif = await Notification.findOne({ userId: from });
    if (!senderNotif) {
      senderNotif = await Notification.create({
        userId: from,
        name: fromName,
        team: { sent: [senderEntry] },
      });
    } else {
      const exists = senderNotif.team?.sent?.some((r) => r.id.toString() === to && r.status === "pending");
      if (exists) return res.status(409).json({ error: "Team request already sent" });

      senderNotif.team.sent.push(senderEntry);
      await senderNotif.save();
    }

    // ✅ Receiver Document
    let receiverNotif = await Notification.findOne({ userId: to });
    if (!receiverNotif) {
      receiverNotif = await Notification.create({
        userId: to,
        name: toName,
        team: { received: [receiverEntry] },
      });
    } else {
      receiverNotif.team.received.push(receiverEntry);
      await receiverNotif.save();
    }

    res.json({ success: true, message: "Team invite sent" });
  } catch (err) {
    console.error("❌ Team Request Error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// POST /api/team/respond
router.post("/respond", async (req, res) => {
  try {
    const { userId, senderId, decision } = req.body;

    const receiverDoc = await Notification.findOne({ userId });
    const senderDoc = await Notification.findOne({ userId: senderId });

    if (!receiverDoc || !senderDoc) {
      return res.status(404).json({ error: "Notification documents not found" });
    }

    const rcvEntry = receiverDoc.team.received.find(e => e.id.toString() === senderId);
    const sndEntry = senderDoc.team.sent.find(e => e.id.toString() === userId);

    if (!rcvEntry || !sndEntry) {
      return res.status(404).json({ error: "Request entry not found" });
    }

    if (decision === "accepted") {
      rcvEntry.status = "accepted";
      sndEntry.status = "accepted";
    } else if (decision === "rejected") {
      receiverDoc.team.received = receiverDoc.team.received.filter(e => e.id.toString() !== senderId);
      senderDoc.team.sent = senderDoc.team.sent.filter(e => e.id.toString() !== userId);
    }

    await receiverDoc.save();
    await senderDoc.save();

    res.json({ message: `Team request ${decision}` });
  } catch (err) {
    console.error("❌ Team respond error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// DELETE /api/team/cancel
router.delete("/cancel", async (req, res) => {
  try {
    const { from, to } = req.body;
    const senderDoc = await Notification.findOne({ userId: from });
    const receiverDoc = await Notification.findOne({ userId: to });

    if (!senderDoc || !receiverDoc) {
      return res.status(404).json({ error: "Notification records not found" });
    }

    senderDoc.team.sent = senderDoc.team.sent.filter((n) => n.id.toString() !== to);
    receiverDoc.team.received = receiverDoc.team.received.filter((n) => n.id.toString() !== from);

    await senderDoc.save();
    await receiverDoc.save();

    res.json({ message: "Team request cancelled" });
  } catch (err) {
    console.error("❌ Cancel team request error:", err.message);
    res.status(500).json({ error: "Failed to cancel request" });
  }
});

module.exports = router;
