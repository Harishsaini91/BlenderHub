// server/models/Notification_schema.js
const mongoose = require("mongoose");
const { Schema, model, Types } = mongoose;

/* ===============================
   🔗 Notification Entry Schema
   (single send or receive entry)
================================= */

const NotificationEntrySchema = new Schema(
  {
    // For "sent": id = receiverId
    // For "received": id = senderId
    id: { type: Types.ObjectId, ref: "User", required: true },

    // Sender info
    senderId: { type: Types.ObjectId, ref: "User" },
    senderName: { type: String },
    senderImage: { type: String },

    // Receiver info
    receiverId: { type: Types.ObjectId, ref: "User" },
    receiverName: { type: String },
    receiverImage: { type: String },

    // Event-specific fields
    eventId: { type: Types.ObjectId, ref: "Event" },
    eventName: { type: String },
    eventDescription: { type: String },
    link: { type: String },
    passkey: { type: String },

    // Optional skills (connection)
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

/* ===============================
   🔗 Category Schema
   (each category has sent[] + received[])
================================= */

const NotificationCategorySchema = new Schema(
  {
    sent: { type: [NotificationEntrySchema], default: [] },
    received: { type: [NotificationEntrySchema], default: [] },
  },
  { _id: false }
);

/* ===============================
   🔗 Main Notification Schema
================================= */

const NotificationSchema = new Schema({
  // One document per user
  userId: { type: Types.ObjectId, ref: "User", required: true, unique: true },
  name: { type: String, required: true },

  // Existing categories
  connection: { type: NotificationCategorySchema, default: {} },
  team: { type: NotificationCategorySchema, default: {} },
  challenge: { type: NotificationCategorySchema, default: {} },

  // NEW — event invites category
  event: { type: NotificationCategorySchema, default: {} },
});

module.exports = model("Notification", NotificationSchema);
