const express = require("express");
const User = require("../models/User");
const router = express.Router();
const auth = require("../middleware/auth");
const path = require("path");
const fs = require("fs");
 const upload = require("../middleware/upload");


/* =========================================================
   UPDATE PROFILE
========================================================= */
router.post("/update-profile", auth, async (req, res) => {
  try {
const loggedInUserId = req.user._id || req.user.id;


    const {
      name,
      email,
      image,
      banner,
      bio,
      linkedin,
      github,
      skills,
      media,
    } = req.body;

    const user = await User.findById(loggedInUserId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    /* ----------------- BASIC FIELDS ----------------- */

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;

    // Normalize bio (string OR array)
    if (bio !== undefined) {
      if (Array.isArray(bio)) {
        user.bio = bio;
      } else {
        user.bio = [bio];
      }
    }

    // Ensure linkedin & github remain arrays
    if (linkedin !== undefined) {
      user.linkedin = Array.isArray(linkedin) ? linkedin : [linkedin];
    }

    if (github !== undefined) {
      user.github = Array.isArray(github) ? github : [github];
    }

    // Ensure skills stay arrays
    if (skills !== undefined) {
      user.skills = Array.isArray(skills)
        ? skills.filter((s) => s && s.trim())
        : [skills];
    }

    // IMAGE FIX: store `/uploads/...` consistently
    if (image) {
      user.image = image.startsWith("/uploads")
        ? image
        : `/uploads/image/${image}`;
    }

 if (banner) {
  const cleanBanner = banner.replace(/^https?:\/\/localhost:5000/, "");

  user.banner = cleanBanner.startsWith("/uploads")
    ? cleanBanner
    : `/uploads/banner/${cleanBanner}`;
}


    /* ----------------- MEDIA SECTION ----------------- */
    if (Array.isArray(media)) {
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
              priority: f.priority ?? fileIndex,
            }))
          : [],
      }));
    }

    /* ----------------- SAVE ----------------- */
    const updatedUser = await user.save();

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/* =========================================================
   GET LOGGED-IN USER PROFILE
========================================================= */
router.get("/me", auth, async (req, res) => {
  try {
    console.log("AUTH USER:", req.user);

const userId = req.user._id || req.user.id;
const profile = await User.findById(userId)
  .select("-password")
  .lean();


    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json({ user: profile });
  } catch (error) {
    console.error("Error fetching profile:", error.message);
    res.status(500).json({ message: "Server error" });
  }
}); 

/* =========================================================
   UPLOAD IMAGE / MEDIA
========================================================= */
router.post("/upload_image", (req, res) => {
  const uploader = upload.any();

  uploader(req, res, (err) => {
    if (err) {
      console.error("Upload error:", err.message);
      return res.status(500).json({ error: "Upload failed" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const result = req.files.map((file) => ({
      fieldname: file.fieldname,
      filename: file.filename,
      path: file.path,
    }));
 
    res.json({
      files: result,
      filename: result.length === 1 ? result[0].filename : undefined,
    });
  });
});

/* =========================================================
   DELETE MEDIA FILE
========================================================= */
router.post("/delete-media-file", (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: "Filename missing" });

  const filePath = path.join(__dirname, "../uploads/media", filename);
  console.log("Deleting:", filePath);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return res.json({ success: true });
  } else {
    return res.status(404).json({ error: "File not found" });
  }
});

/* =========================================================
   GET ANOTHER USER'S PROFILE
========================================================= */
router.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password -email")
      .lean();

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    res.json({ success: true, user });
  } catch (err) {
    console.error("User fetch error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================================
   MUST BE LAST
========================================================= */
module.exports = router;
