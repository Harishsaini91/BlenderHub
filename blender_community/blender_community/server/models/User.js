const mongoose = require("mongoose");
const { Schema, model, Types } = mongoose;

// Subschema for uploaded media files
const FileSchema = new Schema({
  url: { type: String, required: true },
  type: { type: String, enum: ["image", "video"], default: "image" },
  priority: { type: Number, default: 0 }
});

// Subschema for each media project
const MediaSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  priority: { type: Number, default: 0 },
  files: { type: [FileSchema], default: [] }
});

// Mutual connection object inside Member
const MutualSchema = new Schema({
  _id: { type: Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true }
}, { _id: false });

// Member (friend/connection) schema
const MemberSchema = new Schema({
  _id: { type: Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  mutuals: { type: [MutualSchema], default: [] }
});

// Main User Schema
const UserSchema = new Schema({
  name: String,
  email: String,
  password: String,
  image: String,
  banner: String,
  bio: [String],
  linkedin: [String],
  github: [String],
  instagram: [String],
  skills: [String],
  location: String,
  role: { type: String, enum: ["beginner", "pro", "student"], default: "beginner" },
  availableForCollab: { type: Boolean, default: false },

  media: { type: [MediaSchema], default: [] },
  members: { type: [MemberSchema], default: [] },

  projects: [{ type: Types.ObjectId, ref: "Project" }],
  likes: [{ type: Types.ObjectId, ref: "Tool" }],
  teams: [{ type: Types.ObjectId, ref: "Team" }],
  tutorials: [{ type: Types.ObjectId, ref: "Tutorial" }],
  events: [{ type: Types.ObjectId, ref: "Event" }],
  promotions: [{ type: Types.ObjectId, ref: "Promotion" }],

  // ✅ Notification references
  notifications: [{ type: Types.ObjectId, ref: "Notification" }],

  // ✅ For caching mutual fetch
  lastMutualFetch: { type: Date, default: null }
});

module.exports = model("User", UserSchema);
