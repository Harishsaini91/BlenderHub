// seed_longterm_projects.js
// Run: node seed_longterm_projects.js

const mongoose = require("mongoose");
const LongTermProjectTeam = require("./models/Projects/LongTermProjectTeam_schema");

const MONGO_URL = "mongodb://127.0.0.1:27017/blender_community";

// YOUR USER ID (creator + lead)
const CREATOR_ID = "6883404d31beffd688046d2a";

async function runSeeder() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URL);

    console.log("✔ Connected.");

    // optional: clear previous dummy seeds
    // await LongTermProjectTeam.deleteMany({ createdBy: CREATOR_ID });

    const dummyTeams = [
      // 1️⃣ Blender Short Film
      {
        teamName: "Blender Short Film – Lost in Shadows",
        createdBy: CREATOR_ID,

        bio: "A cinematic short created using Blender. Focuses on shadows, stylized rendering, and storytelling.",
        tags: ["Blender", "Animation", "Storytelling"],

        members: [
          {
            userId: CREATOR_ID,
            name: "Harish Saini",
            email: "hskharishsaini123@gmail.com",
            role: "Lead",
          },
          {
            name: "Mehak Verma",
            email: "mehak.v@gmail.com",
            role: "Animator",
          },
          {
            name: "Rohan Chauhan",
            email: "rohan.cg@gmail.com",
            role: "Environment Artist",
          },
          {
            name: "Ram",
            email: "ram@gmail.com",
            role: "Member",
          },
        ],

        repo: {
          owner: "blendstudio",
          name: "lost-in-shadows",
          url: "https://github.com/blendstudio/lost-in-shadows",
          previewReadme: "",
        },

        projects: [
          {
            title: "Initial Media",
            description: "Concept art preview",
            media: ["/uploads/image/sample1.png"],
          },
        ],

        isPublic: true,
      },

      // 2️⃣ Blender AI Motion Tool
      {
        teamName: "AI Motion Capture Retargeting Tool",
        createdBy: CREATOR_ID,

        bio: "AI-powered motion capture retargeting pipeline for Blender.",
        tags: ["Blender", "AI", "Motion Capture"],

        members: [
          {
            userId: CREATOR_ID,
            name: "Harish Saini",
            email: "hskharishsaini123@gmail.com",
            role: "Lead",
          },
          {
            name: "Neha Sharma",
            email: "neha.ai@gmail.com",
            role: "ML Engineer",
          },
        ],

        repo: {
          owner: "aimocap",
          name: "retarget-tool",
          url: "https://github.com/aimocap/retarget-tool",
        },

        projects: [],
        isPublic: true,
      },

      // 3️⃣ Procedural City Generator
      {
        teamName: "Procedural City Generator",
        createdBy: CREATOR_ID,

        bio: "High-detail city generation using Blender Geometry Nodes.",
        tags: ["Geometry Nodes", "Procedural", "Blender"],

        members: [
          {
            userId: CREATOR_ID,
            name: "Harish Saini",
            email: "hskharishsaini123@gmail.com",
            role: "Lead",
          },
          {
            name: "Amit Singh",
            email: "amit.cg@gmail.com",
            role: "Technical Artist",
          },
        ],

        repo: {
          url: "https://github.com/proccity/city-gen",
        },

        projects: [],
        isPublic: true,
      },

      // 4️⃣ Realistic Ocean Simulation
      {
        teamName: "Realistic Ocean Simulation",
        createdBy: CREATOR_ID,

        bio: "Advanced ocean simulation built with Blender fluids and custom shaders.",
        tags: ["Ocean", "Simulation", "Blender"],

        members: [
          {
            userId: CREATOR_ID,
            name: "Harish Saini",
            email: "hskharishsaini123@gmail.com",
            role: "Lead",
          },
        ],

        repo: {
          url: "https://github.com/oceanfx/ocean-sim",
        },

        projects: [],
        isPublic: true,
      },

      // 5️⃣ Material Library Pro Addon
      {
        teamName: "Blender Addon – Material Library Pro",
        createdBy: CREATOR_ID,

        bio: "A Blender addon featuring 200+ procedural materials.",
        tags: ["Materials", "Addon", "Blender"],

        members: [
          {
            userId: CREATOR_ID,
            name: "Harish Saini",
            email: "hskharishsaini123@gmail.com",
            role: "Lead",
          },
          {
            name: "Pooja",
            email: "pooja.ui@gmail.com",
            role: "UI Designer",
          },
        ],

        repo: {
          url: "https://github.com/materialpro/addon",
        },

        projects: [],
        isPublic: true,
      },
    ];

    await LongTermProjectTeam.insertMany(dummyTeams);

    console.log("🎉 Successfully inserted 5 dummy long-term team projects!");
    process.exit(0);

  } catch (error) {
    console.error("❌ Seeder failed:", error);
    process.exit(1);
  }
}

runSeeder();
