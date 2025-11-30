/**
 * seed.js
 * Medium dataset (30 users) for Blender Community
 *
 * Run:
 *   node seed.js
 *
 * Make sure your models are at the require() locations used below.
 */

const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

/* =============================
   REQUIRES - update paths if needed
   ============================= */
const User = require("./models/User");
const Project = require("./models/Project_schema");
const LongTermTeam = require("./models/Projects/LongTermProjectTeam_schema");
const Event = require("./models/Event/Event");
const EventTeam = require("./models/Event/EventParticipationTeam");
const ChatRoom = require("./models/ChatRoom_schema");
const Notification = require("./models/Notification_schema");
const FilterOption = require("./models/FilterOption");
const Feedback = require("./models/Feedback_schema");

/* =============================
   DB CONNECT
   ============================= */
const MONGO = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/blender_community";
mongoose.set('strictQuery', false);

async function connectDb() {
  await mongoose.connect(MONGO, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log("✔ Connected to MongoDB");
}

/* =============================
   Helpers & pools
   ============================= */
const randBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const random = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sample = (arr, n) => {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
};

const firstNames = [
  "Aarav", "Arjun", "Priya", "Sneha", "Rohan", "Kiran", "Harish", "Anita", "Vikas", "Komal",
  "Dev", "Asha", "Manish", "Nisha", "Pooja", "Ravi", "Suman", "Neha", "Amit", "Simran",
  "Deepak", "Isha", "Kavya", "Kunal", "Ritika", "Sahil", "Maya", "Lokesh", "Biju", "Kiran2"
];

const lastNames = [
  "Sharma", "Patel", "Reddy", "Gupta", "Singh", "Kumar", "Mehta", "Saini", "Kaur", "Varma"
];

const skillsPool = [
  "Blender", "3D Modeling", "Texturing", "Rendering", "Animation", "Rigging", "Sculpting",
  "Substance Painter", "Photoshop", "Illustrator", "After Effects", "React", "Node.js", "MongoDB", "UI/UX"
];

const locations = ["Bengaluru", "Mumbai", "Delhi", "Pune", "Hyderabad", "Chennai", "Kolkata"];

const bios = [
  "3D generalist exploring creative pipelines.",
  "Passionate about hard-surface modeling and textures.",
  "Motion designer and UI tinkerer.",
  "Student learning Blender and web tech.",
  "Freelancer open for collabs and gigs."
];

const levelOptions = ["Beginner", "Intermediate", "Advanced", "Other"];

/* Fake media helpers (you'll replace files later) */
const fakeImagePath = (i) => `/uploads/image/seed_img_${i}.jpg`;
const fakeBannerPath = (i) => `/uploads/banner/seed_banner_${i}.jpg`;
const fakeMediaPath = (i) => `/uploads/media/seed_media_${i}.jpg`;
const fakeVideoPath = (i) => `/uploads/media/seed_video_${i}.mp4`;

/* Create deterministic-ish ObjectIds for referencing easily */
let _oidCounter = 1;
function newId() {
  // Create different hex by incrementing _oidCounter
  const hex = (Date.now() + _oidCounter++).toString(16).slice(-24).padStart(24, '0');
  return new mongoose.Types.ObjectId();
}


function makeProjectMedia(count = 2) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      url: fakeMediaPath(randBetween(1, 20)),
      type: "image",
      format: "jpg",
      priority: i,
      likes: []
    });
  }
  return arr;
}

/* =============================
   MAIN SEED LOGIC
   ============================= */
async function seed() {
  try {
    await connectDb();

    // wipe collections (you already deleted but still safe)
    console.log("Cleaning collections...");
    await Promise.all([
      User.deleteMany({}),
      Project.deleteMany({}),
      LongTermTeam.deleteMany({}),
      Event.deleteMany({}),
      EventTeam.deleteMany({}),
      ChatRoom.deleteMany({}),
      Notification.deleteMany({}),
      FilterOption.deleteMany({}),
      Feedback.deleteMany({})
    ]);
    console.log("Collections cleared.");

    /* -------------------------
       1) CREATE 30 USERS
       ------------------------- */
    console.log("Creating users...");
    const users = [];
    for (let i = 0; i < 30; i++) {
      const fn = firstNames[i % firstNames.length];
      const ln = lastNames[i % lastNames.length];
      const name = `${fn} ${ln}`;
      const email = `${fn.toLowerCase()}.${i}@example.com`;
      const uId = newId();

      const skillCount = randBetween(2, 5);
      const skills = sample(skillsPool, skillCount);

      const user = {
        _id: uId,
        name,
        email,
        password: `pw_${i}`, // placeholder
        image: fakeImagePath((i % 10) + 1),
        banner: fakeBannerPath((i % 6) + 1),
        bio: sample(bios, randBetween(1, 2)),
        linkedin: [`https://linkedin.com/in/${fn.toLowerCase()}${i}`],
        github: [`https://github.com/${fn.toLowerCase()}${i}`],
        instagram: [],
        skills,
        location: random(locations),
        role: ["beginner", "student", "pro"][randBetween(0, 2)],
        availableForCollab: Math.random() > 0.5,
        media: [], // will fill below
        members: [], // fill mutuals later
        projects: [],
        likes: [],
        teams: [],
        tutorials: [],
        events: [],
        promotions: [],
        notifications: [],
        eventsParticipated: [],
        lastMutualFetch: null
      };

      users.push(user);
    }

    // Insert users to DB
    await User.insertMany(users);
    console.log("Inserted users:", users.length);

    /* -------------------------
       2) BUILD MUTUAL CONNECTION GRAPH
       - average ~6 connections per user
       - create clusters and triangles
       ------------------------- */
    console.log("Building mutual connections...");
    // choose clusters: group of 6 clusters of ~5 each
    const clusterCount = 6;
    const clusterSize = Math.ceil(users.length / clusterCount);

    for (let c = 0; c < clusterCount; c++) {
      const start = c * clusterSize;
      const group = users.slice(start, start + clusterSize);
      // fully connect group with probability
      for (let a = 0; a < group.length; a++) {
        for (let b = a + 1; b < group.length; b++) {
          if (Math.random() < 0.7) {
            // add mutual for both
            const A = group[a];
            const B = group[b];
            // avoid duplicates
            if (!A.members.some(m => m._id && m._id.equals(B._id))) {
              A.members.push({ _id: B._id, name: B.name, mutuals: [] });
            }
            if (!B.members.some(m => m._id && m._id.equals(A._id))) {
              B.members.push({ _id: A._id, name: A.name, mutuals: [] });
            }
          }
        }
      }
    }

    // cross-cluster bridges
    for (let i = 0; i < 40; i++) {
      const a = random(users);
      const b = random(users);
      if (a._id.equals(b._id)) continue;
      if (!a.members.some(m => m._id.equals(b._id))) {
        a.members.push({ _id: b._id, name: b.name, mutuals: [] });
      }
      if (!b.members.some(m => m._id.equals(a._id))) {
        b.members.push({ _id: a._id, name: a.name, mutuals: [] });
      }
    }

    // compute mutuals arrays for members (small sets)
    users.forEach(u => {
      u.members = u.members.map(m => {
        const mutualList = users
          .filter(other => other._id !== u._id && other.members.some(mm => mm._id.equals(m._id)))
          .slice(0, 3)
          .map(x => ({ _id: x._id, name: x.name }));
        return { _id: m._id, name: m.name, mutuals: mutualList };
      });
    });

    // save updated member lists
    for (const u of users) {
      await User.findByIdAndUpdate(u._id, { members: u.members });
    }
    console.log("Mutual connections created.");

    /* -------------------------
       3) CREATE MEDIA (per user) and PROJECTS collection
       ------------------------- */
    console.log("Creating media and projects...");
    const projectsToInsert = [];
    let projectCounter = 1;
    for (let uIdx = 0; uIdx < users.length; uIdx++) {
      const u = users[uIdx];
      const mediaCount = randBetween(1, 4); // media projects per user
      for (let m = 0; m < mediaCount; m++) {
        const filesCount = randBetween(1, 4);
        const files = [];
        for (let f = 0; f < filesCount; f++) {
          files.push({
            url: fakeMediaPath(randBetween(1, 12)),
            type: "image",
            priority: f
          });
        }
        const mediaObj = {
          title: `Media Project ${projectCounter}`,
          description: `Demo media project ${projectCounter} by ${u.name}`,
          priority: m,
          files
        };
        // push into user's media
        await User.findByIdAndUpdate(u._id, { $push: { media: mediaObj } });
        projectCounter++;
      }

      // create 1 project doc for some users
   if (Math.random() > 0.3) {
  const proj = {
    owner: u._id,
    name: u.name,
    projects: [
      {
        title: `${u.name}'s Key Project`,
        description: `Flagship project by ${u.name}`,
        keywords: sample(["Blender","Sci-fi","Character","Env"], randBetween(1,3)),
        media: makeProjectMedia(randBetween(1,3)),  // FIXED
        likes: [],
        comments: [],
        category: sample([["3D","Blender"],["UI"],["Concept"]],1)[0],
        status: "published",
        visibility: "public", 
        isFeatured: Math.random()>0.9,
        isTrending: Math.random()>0.8,
        collaborators: [],
        user: { 
          name: u.name, 
          image: u.image, 
          links: { github: u.github[0], instagram: "" } 
        }
      }
    ]
  };

  projectsToInsert.push(proj);
}

    }
    if (projectsToInsert.length) {
      await Project.insertMany(projectsToInsert);
      console.log("Inserted projects:", projectsToInsert.length);
    }

    /* -------------------------
       4) NOTIFICATIONS (one doc per user)
       ------------------------- */
    console.log("Creating notifications docs...");
    const notificationsDocs = [];
    for (const u of users) {
      const doc = {
        _id: newId(),
        userId: u._id,
        name: u.name,
        connection: { sent: [], received: [] },
        team: { sent: [], received: [] },
        challenge: { sent: [], received: [] },
        event: { sent: [], received: [] }
      };
      notificationsDocs.push(doc);
    }
    await Notification.insertMany(notificationsDocs);
    console.log("Inserted notifications for users.");

    /* Add some connection requests randomly across users */
    function pushNotification(cat, fromUser, toUser, extras = {}) {
      // cat: "connection","team","challenge","event"
      const sentEntry = {
        id: toUser._id,
        senderId: fromUser._id,
        senderName: fromUser.name,
        senderImage: fromUser.image,
        receiverId: toUser._id,
        receiverName: toUser.name,
        receiverImage: toUser.image,
        skills: fromUser.skills.slice(0, 3),
        status: extras.status || "pending",
        date: new Date()
      };
      const receivedEntry = { ...sentEntry, id: fromUser._id };

      // push into Notification docs
      Notification.findOneAndUpdate({ userId: fromUser._id }, { $push: { [`${cat}.sent`]: sentEntry } }).exec();
      Notification.findOneAndUpdate({ userId: toUser._id }, { $push: { [`${cat}.received`]: receivedEntry } }).exec();
    }

    // Generate ~120 notification actions (connection/team/challenge/event)
    const totalActions = 120;
    const cats = ["connection", "team", "challenge", "event"];
    for (let i = 0; i < totalActions; i++) {
      const A = random(users);
      const B = random(users);
      if (A._id.equals(B._id)) continue;
      const cat = random(cats);
      pushNotification(cat, A, B, { status: random(["pending", "accepted", "rejected"]) });
    }
    console.log("Seeded notifications (queued updates).");

    /* -------------------------
       5) EVENTS + EVENT TEAMS + PARTICIPANTS
       ------------------------- */
    console.log("Creating events and event teams...");
    const events = [];
    const eventTeams = [];
    for (let e = 0; e < 10; e++) {
      const owner = random(users);
      const eventId = newId();
      const mode = random(["solo", "team", "both"]);
      const start = new Date(Date.now() - randBetween(1, 30) * 24 * 3600 * 1000);
      const end = new Date(start.getTime() + randBetween(2, 20) * 24 * 3600 * 1000);

      const eventDoc = {
        _id: eventId,
        userId: owner._id,
        username: owner.name,
        email: owner.email,
        contact: "9876543210",
        name: `${owner.name}'s ${mode} Event ${e + 1}`,
        description: `Event description by ${owner.name}`,
        rules: "Be creative. Submit original work.",
        prize: `${randBetween(100, 1000)} USD`,
        level: random(levelOptions),
        exampleUrl: "",
        startTime: start,
        endTime: end,
        media: [{ url: fakeMediaPath(randBetween(1, 12)), filename: `media_${e}.jpg`, type: "image" }],
        visibility: Math.random() > 0.3 ? "public" : "private",
        passkey: null,
        eventLink: `evt-${eventId.toString().slice(-6)}`,
        sharedWith: [],
        comments: [],
        likes: randBetween(0, 40),
        votes: randBetween(0, 20),
        likedUsers: [],
        votedUsers: [],
        participants: [],
        eventMode: mode,
        maxTeamSize: mode === "team" ? randBetween(2, 5) : 1,
        participatingTeams: [],
        workVisibleToPublic: end < Date.now()
      };

      events.push(eventDoc);

      // create 1-3 teams for team-mode events
      if (mode !== "solo") {
        const teamsForEvent = randBetween(1, 3);
        for (let t = 0; t < teamsForEvent; t++) {
          const creator = random(users);
          const membersCount = randBetween(2, Math.min(5, users.length));
          const members = sample(users, membersCount).map(member => ({
            userId: member._id,
            name: member.name,
            email: member.email,
            avatarUrl: member.image,
            github: member.github[0] || "",
            role: "Member",
            joinedAt: new Date()
          }));

          const teamDoc = {
            _id: newId(),
            eventId: eventId,
            eventName: eventDoc.name,
            teamName: `${creator.name}-team-${t + 1}`,
            createdBy: creator._id,
            members,
            repo: {
              owner: creator.name.toLowerCase(),
              name: `${creator.name}-repo-${t + 1}`,
              url: `https://github.com/${creator.name.toLowerCase()}/${creator.name}-repo-${t + 1}`,
              private: false,
              description: `Team repo for ${creator.name}`,
              previewReadme: "README excerpt",
              submittedAt: null
            },
            submissionStatus: "not_submitted",
            publicVisibility: false,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          eventTeams.push(teamDoc);
          eventDoc.participatingTeams.push(teamDoc._id);
        }
      } else {
        // add some solo participants
        const participantsCount = randBetween(1, 6);
        for (let p = 0; p < participantsCount; p++) {
          const partUser = random(users);
          eventDoc.participants.push({
            userId: partUser._id,
            email: partUser.email,
            name: partUser.name,
            phone: "9000000000",
            portfolio: partUser.github[0] || "",
            skill: sample(partUser.skills, 1)[0],
            githubRepo: { url: "", owner: "", name: "", previewReadme: "" },
            otp: null,
            emailVerified: true,
            submittedAt: new Date()
          });
          // mark user participated
          await User.findByIdAndUpdate(partUser._id, { $push: { eventsParticipated: { eventId: eventId, participatedAs: "solo", date: new Date() } } });
        }
      }
    }

    // insert events & eventTeams
    if (events.length) await Event.insertMany(events);
    if (eventTeams.length) await EventTeam.insertMany(eventTeams);
    console.log(`Inserted ${events.length} events and ${eventTeams.length} event teams.`);

    /* -------------------------
       6) LONG-TERM PROJECT TEAMS
       ------------------------- */
    console.log("Creating long-term project teams...");
    const projectTeams = [];
    for (let t = 0; t < 8; t++) {
      const creator = random(users);
      const members = sample(users, randBetween(2, 5)).map(member => ({
        userId: member._id,
        name: member.name,
        email: member.email,
        github: member.github[0] || "",
        avatarUrl: member.image,
        role: "Member",
        joinedAt: new Date()
      }));
      const pteam = {
        _id: newId(),
        teamName: `${creator.name}-LongTeam-${t + 1}`,
        createdBy: creator._id,
        bio: `Long-term team for ${creator.name}`,
        tags: sample(["game", "vfx", "asset", "tool"], randBetween(1, 3)),
        members,
        repo: {
          owner: creator.name.toLowerCase(),
          name: `${creator.name}-lt-repo`,
          url: `https://github.com/${creator.name.toLowerCase()}/${creator.name}-lt-repo`,
          private: false,
          description: "Long term project repo",
          previewReadme: "Readme excerpt",
          linkedAt: new Date()
        },
        projects: [
          { title: "Team Project Alpha", description: "Team project sample", media: [String], 
            createdAt: new Date() }
        ],
        socialLinks: {},
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      projectTeams.push(pteam);
    }
    if (projectTeams.length) await LongTermTeam.insertMany(projectTeams);
    console.log(`Inserted ${projectTeams.length} long-term teams.`);

    /* -------------------------
       7) CHAT ROOMS (15 rooms)
       - Each room between 2-5 members
       - messages map keyed by user._id with text & file arrays
       ------------------------- */
    console.log("Creating chat rooms...");
    const chatrooms = [];
    for (let r = 0; r < 15; r++) {
      const roomMembers = sample(users, randBetween(2, 5)).map(u => ({ _id: u._id, name: u.name }));
      const messagesMap = new Map();

      // Build some messages per user
      roomMembers.forEach(mem => {
        const msgs = [];
        const files = [];
        const msgCount = randBetween(1, 5);
        for (let m = 0; m < msgCount; m++) {
          msgs.push({ text: `Hi from ${mem.name} (#${m + 1})`, time: new Date(Date.now() - randBetween(0, 10) * 3600 * 1000) });
        }
        // maybe attach a file for some users
        if (Math.random() > 0.7) {
          files.push({ fileName: `file_${r}_${mem._id}.png`, fileUrl: `/uploads/media/seed_media_${randBetween(1, 12)}.jpg`, fileType: "image", time: new Date() });
        }
        messagesMap.set(mem._id.toString(), { text: msgs, file: files });
      });

      // create lastMessage from last member
      const lastMember = roomMembers[roomMembers.length - 1];
      const lastMessage = { text: `Last message from ${lastMember.name}`, sender: lastMember.name, createdAt: new Date() };

      const room = {
        _id: newId(),
        members: roomMembers,
        messages: Array.from(messagesMap.entries()).reduce((acc, [k, v]) => {
          acc.set(k, v); // we'll convert later
          return acc;
        }, new Map()),
        lastMessage
      };

      // Mongoose Map conversion requires plain object with nested maps saved differently.
      // We'll construct save object below.
      chatrooms.push(room);
    }

    // Insert chatrooms properly: convert Map to object
    for (const cr of chatrooms) {
      const obj = {
        _id: cr._id,
        members: cr.members,
        messages: {}, // messages as object with keys
        lastMessage: cr.lastMessage,
      };
      cr.messages.forEach((v, k) => {
        obj.messages[k] = v;
      });
      await ChatRoom.create(obj);
    }
    console.log(`Inserted ${chatrooms.length} chat rooms.`);

    /* -------------------------
       8) NOTIFICATION DOCUMENTS were created earlier,
       add some accepted statuses and link events & teams
       ------------------------- */
    console.log("Finalizing notifications and linking some events/teams...");
    // link some events to owners (Event Schema post save updates user's events array too)
    for (const ev of events) {
      await Event.findByIdAndUpdate(ev._id, ev, { upsert: true });
    }
    for (const team of eventTeams) {
      await EventTeam.findByIdAndUpdate(team._id, team, { upsert: true });
    }

    // Update random users to include events created
    for (const ev of events.slice(0, 6)) {
      await User.findByIdAndUpdate(ev.userId, { $addToSet: { events: ev._id } });
    }

    // For some notifications mark accepted
    await Notification.updateMany({}, { $set: { "connection.sent.$[s].status": "pending" } }, { arrayFilters: [{ "s.status": { $exists: true } }], multi: true }).catch(() => { });
    // (we seeded mixed statuses earlier through direct updates; this step is best-effort patch)

    /* -------------------------
       9) FilterOptions & Feedback
       ------------------------- */
    console.log("Inserting filter options and sample feedback...");
    const filterDoc = {
      location: locations,
      skills: skillsPool,
      available: ["collab", "freelance", "hiring"]
    };
    await FilterOption.create(filterDoc);

    const feedbacks = [
      { userId: users[0]._id.toString(), username: users[0].name, enteredName: "Test User", comment: "Love this platform!" },
      { userId: users[1]._id.toString(), username: users[1].name, enteredName: "Friend", comment: "Great place to collaborate." }
    ];
    await Feedback.insertMany(feedbacks);

    console.log("Seeding complete. Summary:");
    console.log("Users:", users.length);
    console.log("Projects approx:", projectsToInsert.length);
    console.log("Events:", events.length);
    console.log("Event Teams:", eventTeams.length);
    console.log("LongTerm Teams:", projectTeams.length);
    console.log("ChatRooms:", chatrooms.length);
    console.log("Notifications:", (await Notification.countDocuments({})));

    console.log("All done — disconnecting.");
    await mongoose.disconnect();
    console.log("Disconnected.");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    mongoose.disconnect();
    process.exit(1);
  }
}

/* Run seed() */
seed();
