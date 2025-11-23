
// blender_community\blender_community\server\models\Event\Event.js
const mongoose = require("mongoose");

const { Schema } = mongoose;

/* ============================
   Subschemas
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

const SharedUserSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  email: String,
  invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
  sharedAt: { type: Date, default: Date.now },
  via: { type: String, enum: ["email", "notification"], default: "email" },
});

const ParticipantSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", default: null },

  email: { type: String, required: true },
  name: String,
  phone: String,
  portfolio: String,
  skill: String,

  githubRepo: {
    url: String,
    owner: String,
    name: String,
    previewReadme: String
  },

  otp: String,
  emailVerified: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});


/* ============================
   Event Schema (Updated)
============================ */

const EventSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  username: String,
  email: String,
  contact: String,

  // Basic Details
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

  // Media
  media: [MediaSchema],

  // Visibility
  visibility: { type: String, enum: ["public", "private"], default: "public" },
  passkey: { type: String, default: null },

  // Unique event link
  eventLink: { type: String, unique: true, sparse: true },

  // Sharing / Social
  sharedWith: [SharedUserSchema],
  comments: [CommentSchema],

  likes: { type: Number, default: 0 },
  votes: { type: Number, default: 0 },
  likedUsers: [{ type: Schema.Types.ObjectId }],
  votedUsers: [{ type: Schema.Types.ObjectId }],

  // Solo participants
  participants: [ParticipantSchema],

  // TEAM MODE
  eventMode: { type: String, enum: ["solo", "team", "both"], default: "solo" },
  maxTeamSize: { type: Number, default: 1 },

  // Teams registered for event
  participatingTeams: [
    { type: Schema.Types.ObjectId, ref: "EventParticipationTeam" }
  ],

  // After event ends, show work publicly
  workVisibleToPublic: { type: Boolean, default: false },

  // Time tracking  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

/* ============================
   Hooks
============================ */

EventSchema.pre("save", function (next) {
  this.updatedAt = new Date();

  // AUTO SHOW WORK AFTER EVENT END
  if (this.endTime && new Date() > new Date(this.endTime)) {
    this.workVisibleToPublic = true;
  }
  next();
});

EventSchema.post("save", async function (doc) {
  try {
    // Correct path for User model
    const User = require("../User");
    await User.findByIdAndUpdate(doc.userId, {
      $addToSet: { events: doc._id }
    });
  } catch (err) {
    console.error("Failed to link event to user:", err.message);
  }
});

EventSchema.post("remove", async function (doc) {
  try {
    const User = require("../User");
    await User.findByIdAndUpdate(doc.userId, {
      $pull: { events: doc._id }
    });
  } catch (err) {
    console.error("Failed to unlink event from user:", err.message);
  }
});

/* ============================
   EXPORT MODEL
============================ */

module.exports = mongoose.model("Event", EventSchema);
