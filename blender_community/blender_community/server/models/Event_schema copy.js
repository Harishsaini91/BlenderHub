// server/models/Event_schema.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

// Subschemas
const CommentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  username: String,
  text: String,
  createdAt: { type: Date, default: Date.now },
});

const MediaSchema = new Schema({
  url: String,
  filename: String,
  type: { type: String, enum: ["image", "video", "other"], default: "image" },
});

const SharedUserSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  email: String,
  invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
  sharedAt: { type: Date, default: Date.now },
  via: { type: String, enum: ["email", "notification"], default: "notification" },
});

// Main Event Schema
const EventSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  username: String,
  email: String,
  contact: String,

  name: { type: String, required: true },
  description: String,
  rules: String,
  prize: String,
  level: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced", "Other"],
    default: "Other",
  },
  exampleUrl: String,

  startTime: Date,
  endTime: Date,

  media: [MediaSchema],

  visibility: { type: String, enum: ["public", "private"], default: "public" },
  passkey: { type: String, default: null },
  eventLink: { type: String, unique: true, sparse: true },

  sharedWith: [SharedUserSchema],

  likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
  votes: [{ type: Schema.Types.ObjectId, ref: "User" }],
  reminders: [{ type: Schema.Types.ObjectId, ref: "User" }],
  comments: [CommentSchema],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Auto-update timestamp
EventSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Post-save: attach to user's events[]
EventSchema.post("save", async function (doc) {
  try {
    const User = require("./User");
    if (doc.userId) {
      await User.findByIdAndUpdate(doc.userId, { $addToSet: { events: doc._id } });
    }
  } catch (err) {
    console.error("Failed to link event to user:", err.message);
  }
});

// Post-remove: detach from user's events[]
EventSchema.post("remove", async function (doc) {
  try {
    const User = require("./User");
    if (doc.userId) {
      await User.findByIdAndUpdate(doc.userId, { $pull: { events: doc._id } });
    }
  } catch (err) {
    console.error("Failed to unlink event from user:", err.message);
  }
});

module.exports = mongoose.model("Event", EventSchema);
