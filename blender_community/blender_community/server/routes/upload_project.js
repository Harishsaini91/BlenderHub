// routes/upload_project.js

const express = require("express");
const multer = require("multer");
const path = require("path");
const Project = require("../models/Project_schema");
const User = require("../models/User");

const router = express.Router();

// ⚙️ Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/projects/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// 📤 POST /api/upload-project
router.post("/upload-project", upload.array("media", 10), async (req, res) => {
  try {
    const {
      ownerId,
      title,
      description,
      keywords,
      category,
      visibility,
      collaborators,
      isFeatured,
      isTrending
    } = req.body;

    const user = await User.findById(ownerId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // 📷 Create media entries from uploaded files
    const media = req.files.map(file => ({
      url: `/uploads/projects/${file.filename}`,
      type: file.mimetype.startsWith("video") ? "video" : "image",
      format: path.extname(file.originalname)
    }));

    // 👥 Collaborators (if provided)
    let collabParsed = [];
    if (collaborators) {
      try {
        collabParsed = JSON.parse(collaborators); // expecting an array
      } catch (err) {
        return res.status(400).json({ error: "Invalid collaborators format" });
      }
    }

    // 🆕 Create new project
    const newProject = new Project({
      owner: ownerId,
      name: user.name,
      projects: [
        {
          title,
          description,
          keywords: keywords ? JSON.parse(keywords) : [],
          media,
          category: category ? JSON.parse(category) : [],
          visibility: visibility || "public",
          collaborators: collabParsed,
          isFeatured: isFeatured === "true",
          isTrending: isTrending === "true",
          user: {
            name: user.name,
            image: user.image,
            links: {
              github: user.github?.[0] || "",
              instagram: user.instagram?.[0] || "",
              other: user.linkedin?.[0] || ""
            }
          }
        }
      ]
    });

    const savedProject = await newProject.save();

    // 🔗 Link project to user
    user.projects.push(savedProject._id);
    await user.save();

    res.status(201).json({ message: "Project uploaded", project: savedProject });
  } catch (error) {
    console.error("Upload Project Error:", error);
    res.status(500).json({ error: "Server error uploading project" });
  }
});

module.exports = router;
