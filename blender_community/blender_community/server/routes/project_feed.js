// ✅ Updated project_feed.js (only saves to DB on final save)
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const Project = require("../models/project_schema");
const User = require("../models/User");

// ✅ Multer media storage config
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

// ✅ Upload media (image/video)
router.post("/projects/upload", upload.single("media"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const ext = path.extname(req.file.originalname).toLowerCase();
  const isVideo = [".mp4", ".mov"].includes(ext);
  const type = isVideo ? "video" : "image";
  const folder = isVideo ? "video" : "image";
  const url = `http://localhost:5000/uploads/project/${folder}/${req.file.filename}`;
  // const url = `http://localhost:5000/uploads/project/${folder}/${req.file.filename}`;

  res.json({ url, type });
});

// ✅ Create project (only called on final Save)
router.post("/projects/create", async (req, res) => {
  try {
    const { title, description, keywords, category, userId, priority, status, visibility, media } = req.body;
    if (!title || !userId) return res.status(400).send("Title and user required");

    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User not found");

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
      media: Array.isArray(media) ? media : [],
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

// ✅ Update existing project (on Save only)
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
    project.keywords = keywords || project.keywords;
    project.category = category || project.category;
    project.status = status || project.status;
    project.visibility = visibility || project.visibility;
    project.priority = parseInt(priority) || project.priority;
    project.media = media || project.media;

    await collection.save();
    res.json({ message: "Project updated", project });
  } catch (err) {
    console.error("Update error", err);
    res.status(500).send("Update failed");
  }
});

// ✅ Get all user projects
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

// ✅ Delete a project
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



// Helper to shuffle
function shuffleArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

// ✅ Get Mutual Feed
router.get("/mutual/projects", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).send("Missing userId");

  try {
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).send("User not found");

    const mutualIds = [];

    // Loop through all connections and store mutuals
    for (const member of user.members) {
      const friend = await User.findById(member._id).lean();
      if (!friend) continue;

      // ✅ Check if this user is also connected to me
      const isMutual = friend.members?.some((m) => m._id.toString() === userId);
      if (isMutual) {
        mutualIds.push(friend._id);

        const alreadySaved = member.mutuals?.some((m) => m._id.toString() === friend._id.toString());
        if (!alreadySaved) {
          await User.updateOne(
            { _id: userId, "members._id": friend._id },
            { $push: { "members.$.mutuals": { _id: friend._id, name: friend.name } } }
          );
        }

        // ✅ Also update THEIR mutuals[] with me
        const friendMember = friend.members.find((m) => m._id.toString() === userId);
        const alreadyInFriend = friendMember?.mutuals?.some((m) => m._id.toString() === user._id.toString());

        if (!alreadyInFriend) {
          await User.updateOne(
            { _id: friend._id, "members._id": userId },
            { $push: { "members.$.mutuals": { _id: user._id, name: user.name } } }
          );
        }
      }

    }

    // ✅ Get all their projects
    const mutualProjects = await Project.find({ owner: { $in: mutualIds } })
      .populate("owner", "name image")
      .lean();

    console.log("✅ Mutual Projects Found:", mutualProjects.length);

    let posts = [];
    for (const doc of mutualProjects) {
      for (const p of doc.projects) {
        posts.push({
          _id: p._id,
          title: p.title,
          description: p.description,
          media: p.files || [],
          likes: p.likes || [],
          views: p.views || [],
          ownerId: doc.owner._id,
          ownerName: doc.owner.name,
          ownerImage: doc.owner.image,
          createdAt: p.createdAt,
        });
      }
    }

    // ✅ Sort + Shuffle
    posts.sort((a, b) => {
      const trendScore = (p) => (p.likes?.length || 0) + (p.views?.length || 0);
      return (
        trendScore(b) - trendScore(a) || new Date(b.createdAt) - new Date(a.createdAt)
      );
    });

    const shuffled = shuffleArray(posts);
    res.json(shuffled);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to load mutual feed");
  }
});

 
// ------------------------------
// router.get("/mutual/projects", async (req, res) => {
//   const userId = req.query.userId;
//   if (!userId) return res.status(400).send("Missing userId");

//   const limit = parseInt(req.query.limit, 10) || 20;

//   // parse exclude list (?exclude=id1,id2 or ?exclude[]=id1&exclude[]=id2)
//   let exclude = req.query.exclude || req.query["exclude[]"] || "";
//   let excludeIds = [];
//   if (Array.isArray(exclude)) excludeIds = exclude;
//   else if (typeof exclude === "string" && exclude.length) excludeIds = exclude.split(",").map(x => x.trim());

//   try {
//     const user = await User.findById(userId).lean();
//     if (!user) {
//       console.warn("mutual feed: user not found", userId);
//       return res.status(404).send("User not found");
//     }

//     // ---------------------------
//     // 1) Build mutual friends list
//     // ---------------------------
//     const mutualIds = [];
//     for (const member of user.members || []) {
//       try {
//         const friend = await User.findById(member._id).lean();
//         if (!friend) continue;
//         const isMutual = Array.isArray(friend.members) && friend.members.some(m => m._id.toString() === userId);
//         if (isMutual) mutualIds.push(friend._id);
//       } catch (innerErr) {
//         console.warn("mutual feed: failed to load friend", member._id, innerErr);
//         continue;
//       }
//     }

//     // ---------------------------
//     // 2) Fetch project collections for mutuals (or fallback)
//     // ---------------------------
//     let docs;
//     if (mutualIds.length > 0) {
//       docs = await Project.find({ owner: { $in: mutualIds } })
//         .populate("owner", "name image")
//         .lean();
//     } else {
//       // FALLBACK: no mutuals — return recent public projects from everyone except the user
//       console.info("mutual feed: no mutuals found for", userId, " — using fallback public feed");
//       docs = await Project.find({ /* all owners */ })
//         .populate("owner", "name image")
//         .lean();
//     }

//     // ---------------------------
//     // 3) Flatten projects into posts
//     // ---------------------------
//     const posts = [];
//     for (const doc of docs || []) {
//       // skip collections owned by the requesting user when in fallback
//       if (!mutualIds.length && doc.owner && doc.owner._id.toString() === userId) continue;

//       for (const p of doc.projects || []) {
//         // respect visibility: when in fallback mode, only include published/public projects
//         if (!mutualIds.length) {
//           if (p.status && p.status !== "published") continue;
//           if (p.visibility && p.visibility !== "public") continue;
//         }

//         // resilient media detection
//         let mediaItems = [];
//         if (Array.isArray(p.media) && p.media.length) mediaItems = p.media;
//         else if (Array.isArray(p.files) && p.files.length) mediaItems = p.files;
//         else if (Array.isArray(p.mediaItems) && p.mediaItems.length) mediaItems = p.mediaItems;

//         posts.push({
//           _id: p._id.toString(),
//           title: p.title,
//           description: p.description,
//           media: (mediaItems || []).map(m => ({ url: m.url, type: m.type || "image" })),
//           likes: p.likes || [],
//           comments: p.comments || [],
//           views: p.views || [],
//           ownerId: doc.owner ? doc.owner._id : doc.owner, // some docs might not have populated owner
//           ownerName: doc.owner ? doc.owner.name : doc.name,
//           ownerImage: doc.owner ? doc.owner.image : undefined,
//           createdAt: p.createdAt
//         });
//       }
//     }

//     const total = posts.length;
//     // debug
//     console.info(`mutual feed: user=${userId} mutualCount=${mutualIds.length} totalPosts=${total}`);

//     // ---------------------------
//     // If small dataset -> return ALL (FULL mode)
//     // ---------------------------
//     if (total < 50) {
//       return res.json({
//         mode: "FULL",
//         items: shuffle(posts),
//         returned: posts.length
//       });
//     }

//     // ---------------------------
//     // PAGED mode -> apply exclude + refill + sort + return `limit`
//     // ---------------------------
//     let available = posts.filter(p => !excludeIds.includes(p._id.toString()));

//     // refill if too few remain after exclude
//     if (available.length < limit) {
//       const missing = limit - available.length;
//       const refill = posts.filter(p => !available.some(a => a._id === p._id));
//       available = [...available, ...refill.slice(0, missing)];
//     }

//     // sort by trend (likes+views) then by recent
//     available.sort((a, b) => {
//       const score = x => (x.likes?.length || 0) + (x.views?.length || 0);
//       return (score(b) - score(a)) || (new Date(b.createdAt) - new Date(a.createdAt));
//     });

//     const finalItems = shuffle(available).slice(0, limit);

//     return res.json({
//       mode: "PAGED",
//       items: finalItems,
//       returned: finalItems.length
//     });
//   } catch (err) {
//     console.error("Mutual feed error:", err);
//     return res.status(500).send("Failed to load mutual feed");
//   }
// });

// single shuffle implementation (Fisher-Yates)
// function shuffle(arr) {
//   const a = [...arr];
//   for (let i = a.length - 1; i > 0; i--) {
//     const j = Math.floor(Math.random() * (i + 1));
//     [a[i], a[j]] = [a[j], a[i]];
//   }
//   return a;
// }



module.exports = router;
