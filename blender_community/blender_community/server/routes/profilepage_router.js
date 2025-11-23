const express = require("express");
const User = require("../models/User");
const router = express.Router();
const auth = require("../middleware/auth"); // middleware to extract req.user
const path = require("path");
const fs = require("fs");
const upload = require('../middleware/upload');


 
 

router.post("/update-profile", auth, async (req, res) => {
  try {
    const loggedInUserId = req.user.id; // from auth middleware

    const {
      name,
      email,
      image,
      banner,
      bio,
      linkedin,
      github,
      skills,
      media
    } = req.body;

    const user = await User.findById(loggedInUserId);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    /**********************************************
     * BASIC FIELDS
     **********************************************/
    if (name) user.name = name;
    if (email) user.email = email;

    // STORE FULL IMAGE PATH
    if (image) user.image = image.startsWith("/uploads")
      ? image
      : `/uploads/image/${image}`;

    // STORE FULL BANNER PATH
    if (banner) user.banner = banner.startsWith("/uploads")
      ? banner
      : `/uploads/image/${banner}`;

    // bio is simple string
    if (typeof bio === "string") user.bio = bio;

    // linkedin & github should remain array
    if (linkedin) {
      user.linkedin = Array.isArray(linkedin)
        ? linkedin
        : [linkedin];
    }

    if (github) {
      user.github = Array.isArray(github)
        ? github
        : [github];
    }

    // skills array
    if (skills) {
      user.skills = Array.isArray(skills)
        ? skills.filter((s) => s.trim())
        : [skills];
    }

    /**********************************************
     * MEDIA SECTION
     **********************************************/
    if (media && Array.isArray(media)) {
      user.media = media.map((m, index) => ({
        title: m.title || "",
        description: m.description || "",
        priority: m.priority ?? index,
        files: Array.isArray(m.files)
          ? m.files.map((f, fileIndex) => ({
              url: f.url.startsWith("/uploads")
                ? f.url
                : `/uploads/image/${f.url}`,
              type: f.type || "image",
              priority: f.priority ?? fileIndex
            }))
          : []
      }));
    }

    /**********************************************
     * SAVE
     **********************************************/
    const updatedUser = await user.save();

    res.json({
      success: true,
      user: updatedUser
    });

  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

 

router.get("/me", auth, async (req, res) => {
  try {
    const profile = await User.findOne({ userId: req.user.id });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
     console.log("USER FROM DB:", profile);

    res.json({ user: profile });
  } catch (error) {
    console.error("Error fetching profile:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});
  
 

router.post("/upload_image", (req, res) => {
  const uploader = upload.any(); // accept all fields

  uploader(req, res, (err) => {
    if (err) {
      console.error("Upload error:", err.message);
      return res.status(500).json({ error: "Upload failed" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    // Return array of uploaded files with metadata
    const result = req.files.map(file => ({
      fieldname: file.fieldname,
      filename: file.filename,
      path: file.path
    }));

    res.json({ files: result });
  });
});



 

router.post("/delete-media-file", (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: "Filename missing" });

  const filePath = path.join(__dirname, "../uploads/media", filename);
  console.log("Deleting:", filePath);

  // ✅ Check before deleting
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      return res.json({ success: true });
    } catch (err) {
      console.error("File delete error:", err);
      return res.status(500).json({ error: "Failed to delete file" });
    }
  } else {
    console.warn("File not found:", filePath);
    return res.status(404).json({ error: "File not found" });
  }
});
module.exports = router;

// get others user profiles view by user
router.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password -email") // hide sensitive info
      .lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
