const mongoose = require("mongoose");
const Event = require("./models/Event_schema.js");

const MONGO_URI = "mongodb://127.0.0.1:27017/blender_community";

async function seedEvent() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");

    const eventData = {
      userId: new mongoose.Types.ObjectId("687d18a8bcc35644dfecdcc0"),
      username: "Biju",
      email: "b@gmail.com",
      contact: "9876543210",
      name: "3D Sculpting Challenge",
      description: "Create a stunning 3D sculpt in Blender. Beginners welcome.",
      rules: "Only Blender allowed. Submit by Nov 28, 2025.",
      prize: "₹3000 + Featured Post",
      level: "Beginner",
      exampleUrl: "https://example.com/blender-showcase",
      startTime: new Date("2025-11-20T10:00:00Z"),
      endTime: new Date("2025-11-28T18:00:00Z"),
      visibility: "public",
      passkey: null,
      eventLink: "biju-3d-sculpting-2025",
      media: [
        { url: "/uploads/events/sample1.jpg", filename: "sample1.jpg", type: "image" },
      ],
    };

    const updatedEvent = await Event.findOneAndUpdate(
      { eventLink: eventData.eventLink }, // find by unique link
      eventData,
      { upsert: true, new: true, setDefaultsOnInsert: true } // create if not exists
    );

    console.log("🎉 Event upserted successfully:");
    console.log(updatedEvent);

    await mongoose.connection.close();
  } catch (err) {
    console.error("❌ Error seeding event:", err);
    mongoose.connection.close();
  }
}

seedEvent();
