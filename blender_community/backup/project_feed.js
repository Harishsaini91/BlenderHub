const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const Project = require("../models/project_schema");
const User = require("../models/User");

// Media storage logic
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isVideo = [".mp4", ".mov"].includes(ext);
    const uploadPath = isVideo ? "uploads/project/video/" : "uploads/project/image/";
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// 🔹 Media upload route
router.post("/projects/upload", upload.single("media"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const ext = path.extname(req.file.originalname).toLowerCase();
  const isVideo = [".mp4", ".mov"].includes(ext);
  const type = isVideo ? "video" : "image";

  const folder = isVideo ? "video" : "image";
  const url = `http://localhost:5000/uploads/project/${folder}/${req.file.filename}`;
  res.json({ url, type });
});

// 🔹 Create project and collection if needed
router.post("/projects/create", async (req, res) => {
  try {
    const { title, description, keywords, category, userId, priority, status, visibility, media } = req.body;
    if (!title || !userId) return res.status(400).send("Title and user required");

    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User not found");

    const parsedMedia = Array.isArray(media)
      ? media
      : typeof media === "string"
      ? JSON.parse(media)
      : [];

const newProject = {
  title,
  description,
  keywords: Array.isArray(keywords)
    ? keywords.map(k => k.trim()).filter(Boolean)
    : String(keywords).split(",").map(k => k.trim()).filter(Boolean),
  category: Array.isArray(category)
    ? category
    : String(category).split(",").map(c => c.trim()).filter(Boolean),
  status: status || "published",
  visibility: visibility || "public",
  media: parsedMedia,
  user: {
    name: user.name,
    image: user.image,
    links: user.links || {}
  },
  priority: parseInt(priority) || 0,
  likes: [],
  views: [],
  comments: []
};


    let collection = await Project.findOne({ owner: userId });
    if (!collection) {
      collection = new Project({ owner: userId, name: user.name, projects: [newProject] });
    } else {
      collection.projects.push(newProject);
    }

    await collection.save();
    res.status(201).json({ message: "Project saved", project: newProject, collectionId: collection._id });
  } catch (err) {
    console.error("Create error:", err);
    res.status(500).send("Internal error");
  }
});

// 🔹 Get all projects for user
router.get("/projects/:userId", async (req, res) => {
  try {
    const collection = await Project.findOne({ owner: req.params.userId });
    if (!collection) return res.json({ projects: [], collectionId: null });
    res.json({ projects: collection.projects, collectionId: collection._id });
  } catch (err) {
    console.error(err);
    res.status(500).send("Fetch failed");
  }
});

// 🔹 Delete a project
router.delete("/projects/:collectionId/:projectId", async (req, res) => {
  const { collectionId, projectId } = req.params;
  try {
    const collection = await Project.findById(collectionId);
    if (!collection) return res.status(404).send("Collection not found");
    collection.projects = collection.projects.filter(p => p._id.toString() !== projectId);
    await collection.save();
    res.json({ message: "Project deleted" });
  } catch (err) {
    console.error("Delete error", err);
    res.status(500).send("Delete failed");
  }
});

// 🔹 Update project
router.put("/projects/:collectionId/:projectId", async (req, res) => {
  const { collectionId, projectId } = req.params;
  const { title, description, keywords, category, priority, status, visibility, media } = req.body;
  try {
    const collection = await Project.findById(collectionId);
    if (!collection) return res.status(404).send("Collection not found");

    const project = collection.projects.id(projectId);
    if (!project) return res.status(404).send("Project not found");

    project.title = title || project.title;
    project.description = description || project.description;
    project.keywords = keywords ? keywords.split(",").map(k => k.trim()) : project.keywords;
    project.category = category ? [category] : project.category;
    project.status = status || project.status;
    project.visibility = visibility || project.visibility;
    project.priority = parseInt(priority) || project.priority;
    project.media = media ? (typeof media === "string" ? JSON.parse(media) : media) : project.media;

    await collection.save();
    res.json({ message: "Project updated", project });
  } catch (err) {
    console.error("Update error", err);
    res.status(500).send("Update failed");
  }
});

// 🔹 Comment
router.post("/projects/:projectId/comment", async (req, res) => {
  const { projectId } = req.params;
  const { userId, text } = req.body;
  try {
    const collection = await Project.findOne({ "projects._id": projectId });
    if (!collection) return res.status(404).send("Project not found");

    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User not found");

    const project = collection.projects.id(projectId);
    project.comments.push({ userId, name: user.name, image: user.image, text });

    await collection.save();
    res.json({ message: "Comment added" });
  } catch (err) {
    console.error("Comment error", err);
    res.status(500).send("Comment failed");
  }
});

// 🔹 Like
router.post("/projects/:projectId/like", async (req, res) => {
  const { projectId } = req.params;
  const { userId } = req.body;
  try {
    const collection = await Project.findOne({ "projects._id": projectId });
    if (!collection) return res.status(404).send("Project not found");

    const project = collection.projects.id(projectId);
    if (!project.likes.includes(userId)) {
      project.likes.push(userId);
      await collection.save();
    }

    res.json({ message: "Liked" });
  } catch (err) {
    console.error("Like error", err);
    res.status(500).send("Like failed");
  }
});

// 🔹 View
router.post("/projects/:projectId/view", async (req, res) => {
  const { projectId } = req.params;
  const { userId } = req.body;
  try {
    const collection = await Project.findOne({ "projects._id": projectId });
    if (!collection) return res.status(404).send("Project not found");

    const project = collection.projects.id(projectId);
    if (!project.views.includes(userId)) {
      project.views.push(userId);
      await collection.save();
    }

    res.json({ message: "Viewed" });
  } catch (err) {
    console.error("View error", err);
    res.status(500).send("View failed");
  }
});

// 🔹 Mutual feed
router.get("/projects/feed/mutual/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const mutualUserIds = await getMutualUserIds(userId); // TODO: real logic
    const projects = await Project.find({ owner: { $in: mutualUserIds } });
    const allProjects = projects.flatMap(c => c.projects);
    res.json(allProjects);
  } catch (err) {
    console.error("Mutual feed error", err);
    res.status(500).send("Feed failed");
  }
});

// Placeholder
async function getMutualUserIds(userId) {
  const allUsers = await User.find();
  return allUsers.map(u => u._id);
}

module.exports = router;
