 

// server/models/Notification_schema.js
const mongoose = require("mongoose");
const { Schema, model, Types } = mongoose;

// Reusable sub-document for a notification entry
const NotificationEntrySchema = new Schema(
  {
    id: { type: Types.ObjectId, ref: "User", required: true }, // target user id for the entry
    senderId: { type: Types.ObjectId, ref: "User" }, // who sent (for received entries)
    senderName: { type: String },
    senderImage: { type: String },
    receiverId: { type: Types.ObjectId, ref: "User" },
    receiverName: { type: String },
    receiverImage: { type: String },

    // event-specific fields
    eventId: { type: Types.ObjectId, ref: "Event" },
    eventName: { type: String },
    eventDescription: { type: String },
    link: { type: String },
    passkey: { type: String },

    skills: { type: [String], default: [] },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    date: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Category-level structure (connection/team/challenge/event)
const NotificationCategorySchema = new Schema(
  {
    sent: { type: [NotificationEntrySchema], default: [] },
    received: { type: [NotificationEntrySchema], default: [] },
  },
  { _id: false }
);

// Main schema — one document per user
const NotificationSchema = new Schema({
  userId: { type: Types.ObjectId, ref: "User", required: true, unique: true },
  name: { type: String, required: true }, // owner's name
  connection: { type: NotificationCategorySchema, default: {} },
  team: { type: NotificationCategorySchema, default: {} },
  challenge: { type: NotificationCategorySchema, default: {} },
  event: { type: NotificationCategorySchema, default: {} }, // new event category
});

module.exports = model("Notification", NotificationSchema);
