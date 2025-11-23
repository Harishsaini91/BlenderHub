// blender_community\blender_community\server\models\Projects\LongTermProjectTeam_schema.js

const mongoose = require("mongoose");
const { Schema } = mongoose;

const ProjectTeamMemberSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  name: String,
  email: String,
  github: String,
  avatarUrl: String,
  role: { type: String, default: "Member" },
  joinedAt: { type: Date, default: Date.now }
});

const ProjectRepoSchema = new Schema({
  owner: String,
  name: String,
  url: String,
  private: Boolean,
  description: String,
  previewReadme: String,
  linkedAt: { type: Date, default: Date.now }
});

const ProjectTeamSchema = new Schema({
  teamName: { type: String, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

  bio: String,
  tags: [String],

  members: [ProjectTeamMemberSchema],

  repo: ProjectRepoSchema,

  projects: [
    {
      title: String,
      description: String,
      media: [String], // images/videos
      createdAt: { type: Date, default: Date.now }
    }
  ],

  socialLinks: {
    website: String,
    youtube: String,
    instagram: String,
    linkedin: String
  },

  isPublic: { type: Boolean, default: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ProjectTeamSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("LongTermProjectTeam", ProjectTeamSchema);
