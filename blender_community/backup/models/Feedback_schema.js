// models/Feedback.js
const mongoose = require("mongoose");

const FeedbackSchema = new mongoose.Schema(
  {
    userId: String,
    username: String,
    enteredName: String,
    comment: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feedback", FeedbackSchema);
