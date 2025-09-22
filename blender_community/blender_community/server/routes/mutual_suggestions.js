// server/routes/mutual_suggestions.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const ChatRoom = require("../models/ChatRoom_schema");
const User = require("../models/User");

const router = express.Router();



router.get("/suggestions/:userId", async (req, res) => {
  const { userId } = req.params;
  const { updateMutuals } = req.query;

  try {
    const currentUser = await User.findById(userId).lean();
    if (!currentUser) return res.status(404).json({ error: "User not found" });

    const connectedIds = currentUser.members.map((m) => m._id.toString());
    const mutualCountMap = {};

    for (const member of currentUser.members) {
      const friend = await User.findById(member._id).lean();
      if (!friend) continue;

      for (const theirConnection of friend.members) {
        const id = theirConnection._id.toString();

        if (id === userId || connectedIds.includes(id)) continue;

        if (!mutualCountMap[id]) {
          mutualCountMap[id] = { count: 0, user: theirConnection };
        }
        mutualCountMap[id].count++;

        // ✅ Save mutuals only if flag true
        if (updateMutuals === "true") {
          const alreadySaved = member.mutuals?.some(
            (m) => m._id.toString() === theirConnection._id.toString()
          );
          if (!alreadySaved) {
            await User.updateOne(
              { _id: userId, "members._id": member._id },
              {
                $push: {
                  "members.$.mutuals": {
                    _id: theirConnection._id,
                    name: theirConnection.name,
                  },
                },
              }
            );
          }
        }
      }
    }

    const suggestions = Object.values(mutualCountMap)
      .sort((a, b) => b.count - a.count)
      .map((item) => ({
        _id: item.user._id,
        name: item.user.name,
        image: item.user.image || "/default-avatar.png",
        count: item.count,
      }));

    res.json(suggestions);
  } catch (err) {
    console.error("❌ Mutual suggestion error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});


module.exports = router;
