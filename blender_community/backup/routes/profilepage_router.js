const express = require("express");
const User = require("../models/User");
const router = express.Router();
const auth = require("../middleware/auth"); // middleware to extract req.user
const path = require("path");
const fs = require("fs");
const upload = require('../middleware/upload');


 
 

router.post("/update-profile", async (req, res) => {

  try {
    const {
      _id,
      name,
      email,
      image,
      banner,
      bio = [],
      linkedin = [],
      github = [],
      skills = [], 
      media = []
    } = req.body;

    if (!_id) return res.status(400).json({ error: "User ID (_id) missing" });

    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Update fields
    user.name = name || user.name;
    user.email = email || user.email;
    user.image = image || user.image;
    user.banner = banner || user.banner;
    user.bio = Array.isArray(bio) ? bio : [bio];
    user.linkedin = Array.isArray(linkedin) ? linkedin : [linkedin];
    user.github = Array.isArray(github) ? github : [github];
    user.skills = Array.isArray(skills) ? skills : [skills];

    // Validate media structure
    user.media = Array.isArray(media)
      ? media.map((m, i) => ({
          title: m.title || "",
          description: m.description || "",
          priority: m.priority ?? i,
          files: Array.isArray(m.files)
            ? m.files.map((f, j) => ({
                url: f.url || "",
                type: f.type || "image",
                priority: f.priority ?? j
              }))
            : []
        }))
      : [];

    const updatedUser = await user.save(); 
    res.json(updatedUser);
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Internal server error" });
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



// router.post("/delete-media-file", (req, res) => {
//   const { filename } = req.body;
//   if (!filename) return res.status(400).json({ error: "Filename required" });

//   const filepath = path.join(__dirname, "../uploads/media", filename);
//   fs.unlink(filepath, (err) => {
//     if (err) {
//       console.error("File delete error:", err.message);
//       return res.status(500).json({ error: "Failed to delete file" });
//     }
//     res.json({ success: true });
//   });
// });



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
