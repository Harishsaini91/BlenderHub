const mongoose = require("mongoose");
const { Schema } = mongoose;

/* ============================
   🧩 Subschemas
============================ */

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

/**
 * SharedUserSchema — used for tracking who event was shared with
 * via email or notification
 */
const SharedUserSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  email: String,
  invitedBy: { type: Schema.Types.ObjectId, ref: "User" },

  status: {
    type: String,
    enum: ["pending", "accepted", "declined"],
    default: "pending",
  },

  sharedAt: { type: Date, default: Date.now },

  via: {
    type: String,
    enum: ["email", "notification"],
    default: "email",
  },
});


const ParticipantSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", default: null },

  email: { type: String, required: true },
  name: String,
  phone: String,
  portfolio: String,
  skill: String,

  otp: String,
  emailVerified: { type: Boolean, default: false },

  submittedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});




/* ============================
   🏆 Main Event Schema
============================ */

const EventSchema = new Schema({
  // Creator Info
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  username: String,
  email: String,
  contact: String,

  // Event Basics
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

  // Time
  startTime: Date,
  endTime: Date,

  // Media list
  media: [MediaSchema],

  // Visibility
  visibility: {
    type: String,
    enum: ["public", "private"],
    default: "public",
  },

  passkey: { type: String, default: null },

  // Unique event link
  eventLink: {
    type: String,
    unique: true,
    sparse: true, // prevents duplicate error when null
  },

  // Shared users (for share-to-users & old share)
  sharedWith: [SharedUserSchema],

  // Interaction
likes: { type: Number, default: 0 },
votes: { type: Number, default: 0 },

likedUsers: [{ type: Schema.Types.ObjectId }],
votedUsers: [{ type: Schema.Types.ObjectId }],

participants: [ParticipantSchema],


  reminders: [{ type: Schema.Types.ObjectId, ref: "User" }],
  comments: [CommentSchema],

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

/* ============================
   🔄 Hooks
============================ */

// auto-update timestamp
EventSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// link event to user on save
EventSchema.post("save", async function (doc) {
  try {
    const User = require("./User");
    if (doc.userId) {
      await User.findByIdAndUpdate(doc.userId, {
        $addToSet: { events: doc._id },
      });
    }
  } catch (err) {
    console.error("Failed to link event to user:", err.message);
  }
});

// unlink event from user on remove
EventSchema.post("remove", async function (doc) {
  try {
    const User = require("./User");
    if (doc.userId) {
      await User.findByIdAndUpdate(doc.userId, {
        $pull: { events: doc._id },
      });
    }
  } catch (err) {
    console.error("Failed to unlink event from user:", err.message);
  }
});

module.exports = mongoose.model("Event", EventSchema);
