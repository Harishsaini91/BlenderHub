/***********************************************
 *  LONG-TERM TEAM PROJECTS (FINAL)
 ***********************************************/
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const axios = require("axios");

const User = require("../models/User");
const LongTermProjectTeam = require("../models/Projects/LongTermProjectTeam_schema");

const { pushNotification } = require("../utils/notificationHelper");
const { sendTeamProjectInvite } = require("../utils/emailService");
const auth = require("../middleware/auth");

/***********************************************
 *  UPLOAD DIRECTORY
 ***********************************************/
const uploadsDir = path.join(__dirname, "..", "uploads", "image");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${unique}-${file.originalname}`);
  },
});
const upload = multer({ storage });


/***********************************************
 *  GITHUB HELPERS
 ***********************************************/
function parseGitHubUrl(url) {
  if (!url) return null;
  const clean = url.replace(/\/+$/, "");
  const parts = clean.split("/");
  if (parts.length < 2) return null;

  return {
    owner: parts[parts.length - 2],
    name: parts[parts.length - 1],
    url: clean,
  };
}

async function fetchReadmeRaw(owner, repo) {
  const urls = [
    `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/README.md`,
    `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`,
    `https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`,
  ];

  for (const u of urls) {
    try {
      const res = await axios.get(u);
      if (res?.data) return res.data;
    } catch {}
  }

  return null;
}


/***********************************************
 * 1️⃣  GET MY PROJECTS (ORDER IMPORTANT)
 ***********************************************/
router.get("/projects/my-projects", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("teams")
      .select("teams");

    return res.json({
      success: true,
      projects: user.teams || []
    });

  } catch (err) {
    console.error("Fetch my projects error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});



/***********************************************
 * 2️⃣  CREATE TEAM PROJECT
 ***********************************************/
router.post("/projects/team", auth, upload.array("media"), async (req, res) => {
  try {
    const user = req.user;

    const {
      teamName,
      bio,
      tags,
      members,
      githubUrl,
      visibility = "public",
    } = req.body;

    if (!teamName)
      return res.status(400).json({ success: false, message: "Team name required" });

    // Parse members
    let parsedMembers =
      typeof members === "string" ? JSON.parse(members) : members || [];

    // Ensure creator is included as Lead
    if (!parsedMembers.some((m) => m.email === user.email)) {
      parsedMembers.unshift({
        userId: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.image || "",
        github: user.github?.[0] || "",
        role: "Lead",
      });
    }

    // Media file URLs
    const fileUrls = (req.files || []).map(
      (f) => `/uploads/image/${path.basename(f.path)}`
    );

    // GitHub repo parsing
    let repo = null;
    if (githubUrl) {
      const parsed = parseGitHubUrl(githubUrl);
      if (parsed) {
        const previewReadme = await fetchReadmeRaw(parsed.owner, parsed.name);
        repo = {
          owner: parsed.owner,
          name: parsed.name,
          url: parsed.url,
          previewReadme,
          linkedAt: new Date(),
        };
      } else repo = { url: githubUrl };
    }

    // Create project
    const doc = await LongTermProjectTeam.create({
      teamName,
      createdBy: user._id,
      bio,
      tags: Array.isArray(tags)
        ? tags
        : (tags || "").split(",").map((s) => s.trim()),
      members: parsedMembers,
      repo,
      projects:
        fileUrls.length > 0
          ? [{ title: "Initial Media", description: "", media: fileUrls }]
          : [],
      isPublic: visibility === "public",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Add team to each member + notifications
    for (const m of parsedMembers) {
      if (!m.email) continue;
      const u = await User.findOne({ email: m.email });
      if (!u) continue;

      await User.findByIdAndUpdate(u._id, {
        $addToSet: { teams: doc._id },
      });

      try {
        await pushNotification({
          userId: u._id,
          category: "team",
          type: "received",
          data: {
            id: String(u._id),
            senderId: String(user._id),
            senderName: user.name,
            teamId: String(doc._id),
            eventDescription: "You were added to a team",
          },
        });
      } catch (err) {
        console.warn("Notification failed:", err.message);
      }

      // Email invite
      if (u.email !== user.email) {
        try {
          await sendTeamProjectInvite({
            to: u.email,
            teamName,
            invitedBy: user.name,
          });
        } catch {}
      }
    }

    return res.json({ success: true, team: doc });
  } catch (err) {
    console.error("Team project error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


/***********************************************
 * 3️⃣  EDIT TEAM PROJECT
 ***********************************************/
router.put("/projects/team/:id", auth, upload.array("media"), async (req, res) => {
  try {
    const project = await LongTermProjectTeam.findById(req.params.id);

    if (!project)
      return res.status(404).json({ success: false, message: "Project not found" });

    if (String(project.createdBy) !== String(req.user._id))
      return res.status(403).json({ success: false, message: "Unauthorized" });

    const { teamName, bio, tags, members, githubUrl, visibility } = req.body;

    project.teamName = teamName ?? project.teamName;
    project.bio = bio ?? project.bio;
    project.tags =
      typeof tags === "string"
        ? tags.split(",").map((x) => x.trim())
        : project.tags;

    project.members =
      typeof members === "string" ? JSON.parse(members) : members || project.members;

    if (githubUrl) {
      project.repo = { url: githubUrl };
    }

    if (visibility)
      project.isPublic = visibility === "public";

    // Append new media
    if (req.files?.length > 0) {
      const newMedia = req.files.map(
        (f) => `/uploads/image/${path.basename(f.path)}`
      );

      project.projects.push({
        title: "Updated Media",
        description: "",
        media: newMedia,
      });
    }

    await project.save();
    return res.json({ success: true, project });
  } catch (err) {
    console.error("Update long-term project error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


/***********************************************
 * 4️⃣  UPLOAD MEDIA ONLY
 ***********************************************/
router.post("/projects/upload", auth, upload.array("media"), async (req, res) => {
  try {
    const files = (req.files || []).map((f) => {
      return `/uploads/image/${path.basename(f.path)}`;
    });

    return res.json({ success: true, urls: files });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Upload failed" });
  }
});


/***********************************************
 * 5️⃣  GITHUB PREVIEW
 ***********************************************/
router.get("/projects/github/preview", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url)
      return res.status(400).json({ success: false, message: "Missing url" });

    const parsed = parseGitHubUrl(url);
    if (!parsed)
      return res.status(400).json({ success: false, message: "Invalid GitHub URL" });

    const readme = await fetchReadmeRaw(parsed.owner, parsed.name);

    return res.json({
      success: true,
      repo: parsed,
      readme: readme || null,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


router.delete("/projects/team/:id", auth, async (req, res) => {
  try {
    const project = await LongTermProjectTeam.findById(req.params.id);
    if (!project)
      return res.status(404).json({ success: false, message: "Project not found" });

    if (String(project.createdBy) !== String(req.user._id))
      return res.status(403).json({ success: false, message: "Unauthorized" });

    await LongTermProjectTeam.findByIdAndDelete(req.params.id);

    return res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    return res.status(500).json({ success: false, message: "Server error while deleting project." });
  }
});

 
module.exports = router;
