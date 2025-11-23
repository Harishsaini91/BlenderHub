// server/routes/events_solo_team.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const axios = require("axios");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Models
const Event = require("../models/Event/Event");
const EventParticipationTeam = require("../models/Event/EventParticipationTeam");
const User = require("../models/User");

// Utils
const {
  sendTeamInvitation,      // used only for team members
  sendPrivateEventAccessEmail, // used only for private events
  sendSystemNotificationEmail
} = require("../utils/emailService");

const {
  pushNotification,
  getOrCreateUserNotification
} = require("../utils/notificationHelper");

// Auth middleware
const auth = require("../middleware/auth");

// ------------------------
// Multer - local upload
// ------------------------
const uploadsDir = path.join(__dirname, "..", "uploads", "image");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${unique}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// ------------------------
// Helpers
// ------------------------
function parseGitHubUrl(url) {
  if (!url) return null;
  try {
    const clean = url.replace(/\/+$/, "");
    const p = clean.split("/");
    const owner = p[p.length - 2];
    const name = p[p.length - 1];
    if (!owner || !name) return null;
    return { owner, name, url: clean };
  } catch (err) {
    return null;
  }
}

async function fetchReadmeRaw(owner, repo) {
  const paths = [
    `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/README.md`,
    `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`,
    `https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`,
  ];

  for (const url of paths) {
    try {
      const res = await axios.get(url, { timeout: 5000 });
      if (res?.data) return res.data;
    } catch {}
  }
  return null;
}

// ------------------------
// GET Event (privacy aware)
// ------------------------
router.get("/events/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();

    if (!event)
      return res.status(404).json({ success: false, message: "Event not found" });

    if (!event.workVisibleToPublic) {
      return res.json({
        success: true,
        event,
        participantCount: event.participants?.length || 0,
        teamCount: event.participatingTeams?.length || 0,
      });
    }

    // After event ends
    if (event.eventMode === "solo") {
      return res.json({ success: true, event, soloParticipants: event.participants });
    }

    if (event.eventMode === "team") {
      const teams = await EventParticipationTeam.find({ eventId: event._id });
      return res.json({ success: true, event, teamParticipants: teams });
    }

    const teams = await EventParticipationTeam.find({ eventId: event._id });
    return res.json({
      success: true,
      event,
      soloParticipants: event.participants,
      teamParticipants: teams,
    });

  } catch (err) {
    console.error("GET /events/:id error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ------------------------
// SOLO PARTICIPATION
// ------------------------
// router.post("/events/:id/participate/solo", auth, upload.none(), async (req, res) => {
//   try {
//     const { id } = req.params;
//     const event = await Event.findById(id);

//     if (!event)
//       return res.status(404).json({ success: false, message: "Event not found" });

//     if (event.eventMode === "team") {
//       return res.status(400).json({
//         success: false,
//         message: "This event accepts TEAM participation only",
//       });
//     }

//     const { name, email, phone, portfolio, skill, githubUrl } = req.body;

//     const participant = {
//       userId: req.user._id,
//       email,
//       name,
//       phone,
//       portfolio,
//       skill,
//       submittedAt: new Date(),
//       updatedAt: new Date(),
//       githubRepo: null,
//     };

//     if (githubUrl) {
//       const parsed = parseGitHubUrl(githubUrl);
//       if (parsed) {
//         const readme = await fetchReadmeRaw(parsed.owner, parsed.name);
//         participant.githubRepo = {
//           url: parsed.url,
//           owner: parsed.owner,
//           name: parsed.name,
//           previewReadme: readme || ""
//         };
//       } else {
//         participant.githubRepo = { url: githubUrl };
//       }
//     }

//     event.participants.push(participant);
//     await event.save();

//     // --------------------------
//     // ADD TO USER.eventsParticipated[]
//     // --------------------------
//     await User.findByIdAndUpdate(req.user._id, {
//       $addToSet: {
//         eventsParticipated: {
//           eventId: event._id,
//           teamId: null,
//           participatedAs: "solo",
//           date: new Date()
//         }
//       }
//     });

//     // --------------------------
//     // ADD DASHBOARD NOTIFICATION
//     // category: event.received
//     // --------------------------
//     await pushNotification({
//       userId: req.user._id,
//       category: "event",
//       type: "received",
//       data: {
//         id: req.user._id,
//         senderId: event.userId,
//         senderName: event.username,
//         receiverId: req.user._id,
//         receiverName: req.user.name,
//         eventId: event._id,
//         eventName: event.name,
//         link: event.eventLink
//       }
//     });

//     // ------------------------
//     // PRIVATE EVENT → send passkey email
//     // ------------------------
//     if (event.visibility === "private" && event.passkey) {
//       await sendPrivateEventAccessEmail({
//         to: req.user.email,
//         eventName: event.name,
//         link: event.eventLink,
//         passkey: event.passkey
//       });
//     }

//     return res.json({ success: true, message: "Participation successful" });

//   } catch (err) {
//     console.error("SOLO participation error:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// });


// ------------------------
// SOLO PARTICIPATION
// ------------------------
// NOTE: removed `upload.none()` to avoid multer JSON issues — auth only
router.post("/events/:id/participate/solo", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);

    if (!event)
      return res.status(404).json({ success: false, message: "Event not found" });

    if (event.eventMode === "team") {
      return res.status(400).json({
        success: false,
        message: "This event accepts TEAM participation only",
      });
    }

    let { name, email, phone, portfolio, skill, skills, githubUrl, githubRepo } = req.body;

    if (!skill && skills) skill = Array.isArray(skills) ? skills.join(", ") : String(skills);

    if (!email) email = req.user?.email || "";
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    const participant = {
      userId: req.user?._id || null,
      email,
      name: name || req.user?.name || "",
      phone: phone || "",
      portfolio: portfolio || "",
      skill: skill || "",
      submittedAt: new Date(),
      updatedAt: new Date(),
      githubRepo: null,
    };

    const gitValue = githubRepo || githubUrl || (req.body.github ? req.body.github : null);

    if (gitValue) {
      const parsed = parseGitHubUrl(gitValue);
      if (parsed) {
        const readme = await fetchReadmeRaw(parsed.owner, parsed.name);
        participant.githubRepo = {
          url: parsed.url,
          owner: parsed.owner,
          name: parsed.name,
          previewReadme: readme || ""
        };
      } else {
        participant.githubRepo = { url: gitValue };
      }
    }

    event.participants = event.participants || [];
    event.participants.push(participant);
    await event.save();

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: {
        eventsParticipated: {
          eventId: event._id,
          teamId: null,
          participatedAs: "solo",
          date: new Date()
        }
      }
    });

    await pushNotification({
      userId: req.user._id,
      category: "event",
      type: "received",
      data: {
        id: req.user._id,
        senderId: event.userId,
        senderName: event.username,
        receiverId: req.user._id,
        receiverName: req.user.name,
        eventId: event._id,
        eventName: event.name,
        link: event.eventLink
      }
    });

    if (event.visibility === "private" && event.passkey) {
      await sendPrivateEventAccessEmail({
        to: email,
        eventName: event.name,
        link: event.eventLink,
        passkey: event.passkey
      });
    }

    return res.json({ success: true, message: "Participation successful", participant });

  } catch (err) {
    console.error("SOLO participation error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


// ------------------------
// TEAM PARTICIPATION
// ------------------------
// router.post("/events/:id/participate/team", auth, upload.none(), async (req, res) => {
//   try {
//     const event = await Event.findById(req.params.id);
//     if (!event)
//       return res.status(404).json({ success: false, message: "Event not found" });

//     if (event.eventMode === "solo") {
//       return res.status(400).json({ success: false, message: "Solo only event" });
//     }

//     let { teamName, members, githubUrl } = req.body;
//     if (!teamName)
//       return res.status(400).json({ success: false, message: "Team name required" });

//     try {
//       if (typeof members === "string") members = JSON.parse(members);
//     } catch {
//       members = [];
//     }

//     const teamMembers = members.map((m) => ({
//       userId: m.userId || null,
//       name: m.name || "",
//       email: m.email || "",
//       avatarUrl: m.avatarUrl || "",
//       github: m.github || "",
//       role: m.role || "Member",
//       joinedAt: new Date()
//     }));

//     if (!teamMembers.some((m) => m.email === req.user.email)) {
//       teamMembers.unshift({
//         userId: req.user._id,
//         name: req.user.name,
//         email: req.user.email,
//         avatarUrl: req.user.image || "",
//         github: req.user.github?.[0] || "",
//         role: "Leader"
//       });
//     }

//     let repo = null;
//     if (githubUrl) {
//       const parsed = parseGitHubUrl(githubUrl);
//       if (parsed) {
//         const readme = await fetchReadmeRaw(parsed.owner, parsed.name);
//         repo = {
//           owner: parsed.owner,
//           name: parsed.name,
//           url: parsed.url,
//           previewReadme: readme || ""
//         };
//       } else {
//         repo = { url: githubUrl };
//       }
//     }

//     const teamDoc = await EventParticipationTeam.create({
//       eventId: event._id,
//       eventName: event.name,
//       teamName,
//       createdBy: req.user._id,
//       members: teamMembers,
//       repo,
//       submissionStatus: "submitted"
//     });

//     event.participatingTeams.push(teamDoc._id);
//     await event.save();

//     // --------------------------
//     // ADD USER.eventsParticipated[] for each team member
//     // --------------------------
//     for (const m of teamMembers) {
//       if (m.userId) {
//         await User.findByIdAndUpdate(m.userId, {
//           $addToSet: {
//             eventsParticipated: {
//               eventId: event._id,
//               teamId: teamDoc._id,
//               participatedAs: "team",
//               date: new Date()
//             }
//           }
//         });
//       }
//     }

//     // --------------------------
//     // SEND team invitation email ONLY TO MEMBERS
//     // --------------------------
//     for (const m of teamMembers) {
//       if (m.email) {
//         await sendTeamInvitation({
//           to: m.email,
//           teamName,
//           eventName: event.name,
//           invitedBy: req.user.name
//         });
//       }
//     }

//     // --------------------------
//     // DASHBOARD NOTIFICATION (received)
//     // --------------------------
//     for (const m of teamMembers) {
//       if (m.userId) {
//         await pushNotification({
//           userId: m.userId,
//           category: "event",
//           type: "received",
//           data: {
//             id: m.userId,
//             senderId: req.user._id,
//             senderName: req.user.name,
//             eventId: event._id,
//             eventName: event.name,
//             link: event.eventLink
//           }
//         });
//       }
//     }

//     // PRIVATE EVENT → send passkey email
//     if (event.visibility === "private" && event.passkey) {
//       for (const m of teamMembers) {
//         if (m.email) {
//           await sendPrivateEventAccessEmail({
//             to: m.email,
//             eventName: event.name,
//             link: event.eventLink,
//             passkey: event.passkey
//           });
//         }
//       }
//     }

//     return res.json({ success: true, message: "Team participation successful", team: teamDoc });

//   } catch (err) {
//     console.error("TEAM participation error:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// });

 
// ------------------------
// TEAM PARTICIPATION
// ------------------------
// NOTE: removed upload.none();
router.post("/events/:id/participate/team", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event)
      return res.status(404).json({ success: false, message: "Event not found" });

    if (event.eventMode === "solo") {
      return res.status(400).json({ success: false, message: "Solo only event" });
    }

    let { teamName, members, githubUrl, githubRepo } = req.body;
    if (!teamName)
      return res.status(400).json({ success: false, message: "Team name required" });

    // Accept array (from frontend) or JSON string
    try {
      if (typeof members === "string") members = JSON.parse(members);
    } catch {
      if (!Array.isArray(members)) members = [];
    }
    if (!Array.isArray(members)) members = [];

    // Normalize members
    const teamMembers = members.map((m) => ({
      userId: m.userId || null,
      name: m.name || "",
      email: m.email || "",
      avatarUrl: m.avatarUrl || "",
      github: m.github || "",
      role: m.role || "Member",
      joinedAt: new Date()
    }));

    // Ensure leader (requesting user) is included
    if (!teamMembers.some((m) => m.email === req.user.email)) {
      teamMembers.unshift({
        userId: req.user._id,
        name: req.user.name,
        email: req.user.email,
        avatarUrl: req.user.image || "",
        github: req.user.github?.[0] || "",
        role: "Leader",
        joinedAt: new Date()
      });
    }

    // repo value: accept githubRepo or githubUrl
    const gitValue = githubRepo || githubUrl || (req.body.repoUrl || null);
    let repo = null;
    if (gitValue) {
      const parsed = parseGitHubUrl(gitValue);
      if (parsed) {
        const readme = await fetchReadmeRaw(parsed.owner, parsed.name);
        repo = {
          owner: parsed.owner,
          name: parsed.name,
          url: parsed.url,
          previewReadme: readme || ""
        };
      } else {
        repo = { url: gitValue };
      }
    }

    const teamDoc = await EventParticipationTeam.create({
      eventId: event._id,
      eventName: event.name,
      teamName,
      createdBy: req.user._id,
      members: teamMembers,
      repo,
      submissionStatus: "submitted"
    });

    event.participatingTeams = event.participatingTeams || [];
    event.participatingTeams.push(teamDoc._id);
    await event.save();

    // add participation entry to users (only for members who have userId)
    for (const m of teamMembers) {
      if (m.userId) {
        try {
          await User.findByIdAndUpdate(m.userId, {
            $addToSet: {
              eventsParticipated: {
                eventId: event._id,
                teamId: teamDoc._id,
                participatedAs: "team",
                date: new Date()
              }
            }
          });
        } catch (uerr) {
          console.warn("Failed to add eventsParticipated for user:", uerr.message);
        }
      }
    }

    // send invites / emails (best-effort)
    for (const m of teamMembers) {
      if (m.email) {
        try {
          await sendTeamInvitation({
            to: m.email,
            teamName,
            eventName: event.name,
            invitedBy: req.user.name
          });
        } catch (mailErr) {
          console.warn("Failed to send team invitation to", m.email, mailErr.message);
        }
      }
    }

    // push notifications for members with userId
    for (const m of teamMembers) {
      if (m.userId) {
        try {
          await pushNotification({
            userId: m.userId,
            category: "event",
            type: "received",
            data: {
              id: m.userId,
              senderId: req.user._id,
              senderName: req.user.name,
              eventId: event._id,
              eventName: event.name,
              link: event.eventLink
            }
          });
        } catch (nerr) {
          console.warn("Failed pushNotification for user", m.userId, nerr.message);
        }
      }
    }

    // private event passkey mail
    if (event.visibility === "private" && event.passkey) {
      for (const m of teamMembers) {
        if (m.email) {
          try {
            await sendPrivateEventAccessEmail({
              to: m.email,
              eventName: event.name,
              link: event.eventLink,
              passkey: event.passkey
            });
          } catch (mailErr) {
            console.warn("Failed to send private access email to", m.email, mailErr.message);
          }
        }
      }
    }

    return res.json({ success: true, message: "Team participation successful", team: teamDoc });

  } catch (err) {
    console.error("TEAM participation error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
