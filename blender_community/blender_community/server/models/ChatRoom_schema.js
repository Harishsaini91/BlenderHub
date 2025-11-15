// blender_community\blender_community\server\models\ChatRoom_schema.js

const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

// Status schema for message deletion
const StatusSchema = new Schema(
  {
    selfDelete: { type: Boolean, default: false },
    bothDeleted: { type: Boolean, default: false },
  },
  { _id: false }
);

// Text message schema
const TextMessageSchema = new Schema(
  {
    text: { type: String, default: "" },
    time: { type: Date, default: Date.now },
    status: { type: StatusSchema, default: () => ({}) },
  },
  { _id: false }
);

// File message schema
const FileMessageSchema = new Schema(
  {
    fileName: { type: String, default: null },
    fileUrl: { type: String, default: null },
    fileType: { type: String, default: null },
    time: { type: Date, default: Date.now },
    status: { type: StatusSchema, default: () => ({}) },
  },
  { _id: false }
);

// User messages object schema
const UserMessagesSchema = new Schema(
  {
    text: { type: [TextMessageSchema], default: [] },
    file: { type: [FileMessageSchema], default: [] },
  },
  { _id: false }
);

// Members schema
const MemberSchema = new Schema(
  {
    _id: { type: Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

// Main ChatRoom schema
const ChatRoomSchema = new Schema(
  {
    members: { type: [MemberSchema], required: true },
    messages: {
      type: Map,
      of: UserMessagesSchema,
      default: () => new Map(),
    },
    lastMessage: {
      text: { type: String, default: "" },
      sender: { type: String, default: "" },
      createdAt: { type: Date },
    },
  },
  { timestamps: true }
);

ChatRoomSchema.index({ "members._id": 1 });

module.exports = mongoose.model("ChatRoom", ChatRoomSchema);
