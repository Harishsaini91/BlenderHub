
// blender_community\blender_community\server\models\EventParticipationTeam.js
const mongoose = require("mongoose");

const { Schema } = mongoose;

const EventTeamMemberSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  name: String,
  email: String,
  avatarUrl: String,
  github: String,
  role: { type: String, default: "Member" },
  joinedAt: { type: Date, default: Date.now }
});

const EventTeamRepoSchema = new Schema({
  owner: String,
  name: String,
  url: String,
  private: Boolean,
  description: String,
  previewReadme: String,
  submittedAt: Date
});

const EventTeamSchema = new Schema({
  // Event connecting
  eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
  eventName: String,

  // Basic information
  teamName: { type: String, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

  // Members
  members: [EventTeamMemberSchema],

  // Repository LINK (not created)
  repo: EventTeamRepoSchema,

  // Status
  submissionStatus: {
    type: String,
    enum: ["not_submitted", "submitted", "approved", "rejected"],
    default: "not_submitted"
  },

  publicVisibility: {
    type: Boolean,
    default: false // becomes true after event deadline
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

EventTeamSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("EventParticipationTeam", EventTeamSchema);
