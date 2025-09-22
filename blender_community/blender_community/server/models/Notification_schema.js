 

const mongoose = require("mongoose");
const { Schema, model, Types } = mongoose;

// Reusable sub-document for a notification entry
const NotificationEntrySchema = new Schema(
  {
    id: { type: Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    image: { type: String },
     skills: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending"
    },
    date: { type: Date, default: Date.now }
  },
  { _id: false }
);

// Category-level structure (connection/team/challenge)
const NotificationCategorySchema = new Schema(
  {
    sent: { type: [NotificationEntrySchema], default: [] },
    received: { type: [NotificationEntrySchema], default: [] }
  },
  { _id: false }
);

// Main schema — one document per user
const NotificationSchema = new Schema({
  userId: { type: Types.ObjectId, ref: "User", required: true, unique: true },
  name: { type: String, required: true }, // owner's name
  connection: { type: NotificationCategorySchema, default: {} },
  team: { type: NotificationCategorySchema, default: {} },
  challenge: { type: NotificationCategorySchema, default: {} }
});

module.exports = model("notification", NotificationSchema);
