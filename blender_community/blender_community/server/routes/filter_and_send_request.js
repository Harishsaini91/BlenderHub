const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Notification = require("../models/Notification_schema");
const FilterOption = require("../models/FilterOption"); // for dropdown filters

// =========================
// 1. GET Filter Options
// =========================
router.get("/filter-options", async (req, res) => {
  try {
    let data = await FilterOption.findOne();

    if (!data) {
      data = await FilterOption.create({
        locations: ["Delhi", "Mumbai", "Bangalore", "Hyderabad"],
        skills: ["React", "Blender", "Photoshop", "Unity", "Figma", "Fusion 360"],
        availableOptions: ["Yes", "No", "Part-Time"],
      });
      console.log("Default filter options created");
    }

    res.json({
      location: data.locations || [],
      skills: data.skills || [],
      available: data.availableOptions || [],
    });
  } catch (err) {
    console.error("Error fetching filter options:", err.message);
    res.status(500).send("Server Error");
  }
});

// =========================
// 2. Search Users
// =========================
router.post("/search-users", async (req, res) => {
  try {
    const { searchTerm, location, skills, available, currentUserId } = req.body;

    const query = {};

    if (searchTerm) query.name = new RegExp(searchTerm, "i");
    if (location) query.location = location;
    if (skills) query.skills = skills;
    if (available !== "") query.availableForCollab = available === "Yes";

    if (currentUserId) {
      query._id = { $ne: currentUserId }; // exclude self
    }

    const users = await User.find(query).select("-password");
    res.json(users);
  } catch (err) {
    console.error("Error searching users:", err.message);
    res.status(500).send("Server Error");
  }
});

// =========================
// 3. Send Connection Request
// =========================
router.post("/connection-request", async (req, res) => {
  try {
    const { from, fromName, fromImage,fromSkills, to, toName, toImage } = req.body;

    if (!from || !fromName || !to || !toName) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const dateNow = new Date();

    // Sender: add to `sent`
    let senderDoc = await Notification.findOne({ userId: from });
    if (!senderDoc) {
      senderDoc = await Notification.create({
        userId: from,
        name: fromName,
        connection: { sent: [] }
      });
    }
    const alreadySent = senderDoc.connection.sent.find(e => e.id.toString() === to);
    if (!alreadySent) {
      senderDoc.connection.sent.push({
        id: to,
        name: toName,
        image: toImage || "",
        status: "pending",
        date: dateNow,
         skills: []
      });
      await senderDoc.save();
    }

    // Receiver: add to `received`
    let receiverDoc = await Notification.findOne({ userId: to });
    if (!receiverDoc) {
      receiverDoc = await Notification.create({
        userId: to,
        name: toName,
        connection: { received: [] }
      });
    }
    const alreadyReceived = receiverDoc.connection.received.find(e => e.id.toString() === from);
    if (!alreadyReceived) {
      receiverDoc.connection.received.push({
        id: from,
        name: fromName,
        image: fromImage || "",
          skills: fromSkills || [],
        status: "pending",
        date: dateNow
      });
      await receiverDoc.save();
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Connection Request Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


 // DELETE: Delete rejected or cancelled request


router.delete("/notifications/:id", async (req, res) => {
  const { id } = req.params;

  const notif = await Notification.findById(id);
  if (!notif) return res.status(404).json({ error: "Notification not found" });

  await notif.deleteOne();
  res.json({ message: "Request deleted" });
});


module.exports = router;
 