// server/utils/notificationHelper.js
const Notification = require("../models/Notification_schema");
const User = require("../models/User");

/**
 * Ensure notification document exists
 */
async function getOrCreateUserNotification(userId) {
  let doc = await Notification.findOne({ userId });

  if (!doc) {
    const user = await User.findById(userId);

    doc = await Notification.create({
      userId,
      name: user?.name || "Unknown",
      connection: { sent: [], received: [] },
      team: { sent: [], received: [] },
      challenge: { sent: [], received: [] },
      event: { sent: [], received: [] },
    });
  }

  return doc;
}

/**
 * Push notification entry into category
 */
// safe, defensive pushNotification
async function pushNotification({ userId, category, type, data }) {
  if (!userId) {
    console.warn("pushNotification called without userId", { category, type, data });
    return false;
  }

  // ensure data is object
  data = data && typeof data === "object" ? { ...data } : {};

  // ensure an 'id' exists inside data — commonly used by your Notification schema
  // fallback order: data.id -> data.userId -> userId (recipient)
  const fallbackId = data.id || data.userId || userId;
  if (!fallbackId) {
    console.warn("pushNotification: cannot determine data.id, skipping", { userId, category, type, data });
    return false;
  }
  data.id = String(fallbackId);

  // coerce common id-like fields to strings for schema compatibility
  if (data.senderId) data.senderId = String(data.senderId);
  if (data.teamId) data.teamId = String(data.teamId);
  if (data.eventId) data.eventId = String(data.eventId);

  // optionally add other metadata
  data.date = new Date();
  if (typeof data.read === "undefined") data.read = false;

  // get or create user notification doc (your helper)
  const notifDoc = await getOrCreateUserNotification(userId);
  if (!notifDoc) {
    console.warn("pushNotification: getOrCreateUserNotification returned falsy for", userId);
    return false;
  }

  // make sure category/type slots exist
  if (!notifDoc[category]) notifDoc[category] = {};
  if (!Array.isArray(notifDoc[category][type])) notifDoc[category][type] = [];

  // push and save
  notifDoc[category][type].push(data);

  try {
    await notifDoc.save();
    return true;
  } catch (err) {
    // don't throw — we want caller to continue even if notification save fails
    console.warn("pushNotification: failed saving notification", {
      userId,
      category,
      type,
      data,
      err: err && err.message ? err.message : err,
    });
    return false;
  }
}


module.exports = { getOrCreateUserNotification, pushNotification };
