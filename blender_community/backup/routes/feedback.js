const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const Feedback = require("../models/Feedback_schema"); // Adjust path as needed

// @route   POST /api/feedback
// @desc    Submit feedback (works for both logged-in and guest users)
// @access  Public
router.post("/feedback", async (req, res) => {
  try {
    const { userId, username, enteredName, comment } = req.body;

    if (!enteredName || !comment) {
      return res.status(400).json({ message: "Name and comment are required" });
    }

    const feedbackData = {
      userId: userId || uuidv4(),       // if not logged in, assign dummy ID
      username: username || "Guest",    // if not logged in
      enteredName,
      comment,
    };

    await Feedback.create(feedbackData);

    res.status(200).json({ message: "Feedback submitted successfully" });
  } catch (err) {
    console.error("Error submitting feedback:", err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
