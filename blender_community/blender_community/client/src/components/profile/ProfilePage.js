import React, { useEffect, useState } from "react";
import axios from "axios";
import EditModal from "./EditModal";
import { openChatWindow } from "../../utils/openChatWindow";
import "assets/styles/components/ProfilePage.css";





/* ------------------------------------------
   DEFAULT USER (fallback only)
------------------------------------------- */
const DUMMY_USER = {
  name: "New User",
  email: "example@example.com",
  image: "default.png",
  banner: "default-banner.jpg",
  bio: ["Add your bio..."],
  linkedin: [],
  github: [],
  skills: ["JavaScript", "React"],
  media: [],
};



/* ------------------------------------------
   MERGE FUNCTION
------------------------------------------- */
const mergeUserData = (base, override) => {
  const merged = { ...base };
  Object.keys(base).forEach((key) => {
    if (override?.[key] !== undefined && override[key] !== null) {
      merged[key] = override[key];
    }
  });
  return merged;
};

const ProfilePage = ({ userId = null, setProfileUserId = null }) => {
  const [user, setUser] = useState(null);
  const [editingSection, setEditingSection] = useState(null);

  /* ------------------------------------------
     READ LOGGED-IN USER & TOKEN
  ------------------------------------------- */
  const loggedInUser =
    JSON.parse(sessionStorage.getItem("user")) ||
    JSON.parse(localStorage.getItem("user") || "{}");

  const loggedInUserId = loggedInUser?._id;

  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  // Attach token automatically
  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  const isSelfProfile = !userId || userId === loggedInUserId;

  /* ------------------------------------------
     LOAD PROFILE DATA
  ------------------------------------------- */
  useEffect(() => {

    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      console.log("Token attached:", token);
    } else {
      console.warn("⚠ No token found — /api/me will fail");
    }



    const init = async () => {
      try {
        // 🔹 When viewing ANOTHER user
        if (userId) {
          const res = await axios.get(
            `http://localhost:5000/api/user/${userId}`
          );
          if (res.data?.success && res.data.user) {
            setUser(res.data.user);
            return;
          }
        }

        // 🔹 When viewing YOUR OWN PROFILE
        const res = await axios.get("http://localhost:5000/api/me");
        if (res.data?.user) {
          setUser(res.data.user);

          sessionStorage.setItem("user", JSON.stringify(res.data.user));
          localStorage.setItem("user", JSON.stringify(res.data.user));
          return;
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      }

      // fallback
      const local =
        sessionStorage.getItem("user") || localStorage.getItem("user");
      setUser(local ? JSON.parse(local) : DUMMY_USER);
    };

    init();
  }, [userId]);

  const handleEdit = (section) => {
    setEditingSection(section);
  };

  /* ------------------------------------------
     SAVE HANDLER
  ------------------------------------------- */
  const handleSave = async (updatedPartial) => {
    const updatedUser = { ...user, ...updatedPartial };
    setUser(updatedUser);

    sessionStorage.setItem("user", JSON.stringify(updatedUser));
    localStorage.setItem("user", JSON.stringify(updatedUser));

    try {
      const res = await axios.post(
        "http://localhost:5000/api/update-profile",
        updatedUser
      );
      if (res.data?.user) {
        const fullUser = mergeUserData(DUMMY_USER, res.data.user);
        setUser(fullUser);

        sessionStorage.setItem("user", JSON.stringify(fullUser));
        localStorage.setItem("user", JSON.stringify(fullUser));
      }
    } catch (err) {
      console.error("Failed to sync with DB:", err);
    }

    setEditingSection(null);
  };

  if (!user) return <p>Loading profile...</p>;

  /* ------------------------------------------
     FIXED URL HELPERS
  ------------------------------------------- */
  const getFullUrl = (url) => {
    if (!url) return "";
    return url.startsWith("/uploads")
      ? `http://localhost:5000${url}`
      : `http://localhost:5000/uploads/image/${url}`;
  };


const MediaCard = ({ project, getFullUrl }) => {
  const [index, setIndex] = useState(0);
  const files = project.files || [];

  if (!files.length) {
    return (
      <div className="media-card">
        <h4>{project.title}</h4>
        <p>{project.description}</p>
        <p style={{ color: "#555" }}>No media uploaded yet.</p>
      </div>
    );
  }

  const file = files[index];
  if (!file) return null; // <--- CRASH PREVENTION

  const mediaUrl = getFullUrl(file.url);

  const next = (e) => {
    e.stopPropagation();
    setIndex((prev) => (prev + 1) % files.length);
  };

  const prev = (e) => {
    e.stopPropagation();
    setIndex((prev) => (prev - 1 + files.length) % files.length);
  };

  return (
    <div className="media-card">
      <h4>{project.title}</h4>
      <p>{project.description}</p>

      <div className="media-viewer">
        {file.type === "image" ? (
          <img className="media-content" src={mediaUrl} alt="media" />
        ) : (
          <video className="media-content" src={mediaUrl} controls />
        )}

        {files.length > 1 && (
          <>
            <button className="arrow left" onClick={prev}>◀</button>
            <button className="arrow right" onClick={next}>▶</button>
          </>
        )}

        <div className="counter">
          {index + 1} / {files.length}
        </div>
      </div>
    </div>
  );
};




  return (
    <div className="profile-container">

      {/* Back Button for viewing others */}
      {userId && setProfileUserId && (
        <button onClick={() => setProfileUserId(null)} className="back-btn">
          ← Back to Connections
        </button>
      )}

      {/* ----------- BANNER ---------------- */}
      <div
        className="banner-section"
        style={{
          backgroundImage: `url(${getFullUrl(user.banner)})`,
        }}
      >
        {isSelfProfile && (
          <div className="top-edit" onClick={() => handleEdit("basic")}>
            ✏️
          </div>
        )}

        {/* Profile Image */}
        <div className="profile-image">
          <img src={getFullUrl(user.image)} alt="User" />
        </div>
      </div>

      {/* ----------- USER INFO CARD ----------- */}
      <div className="profile-info-card">
        <h2>{user.name}</h2>

        {!isSelfProfile && (
          <button
            className="chat-start-btn"
            onClick={() => openChatWindow(user._id)}
          >
            💬 Chat
          </button>
        )}

        <div className="icons">
          {(Array.isArray(user.linkedin) ? user.linkedin : [user.linkedin])
            .filter(Boolean)
            .map((link, i) => (
              <a key={i} href={link} target="_blank">
                🔗 LinkedIn {i + 1}
              </a>
            ))}

          {(Array.isArray(user.github) ? user.github : [user.github])
            .filter(Boolean)
            .map((link, i) => (
              <a key={i} href={link} target="_blank">
                💻 GitHub {i + 1}
              </a>
            ))}
        </div>
      </div>

      {/* ----------- BIO ---------------- */}
      <div className="bio-section">
        {(Array.isArray(user.bio) ? user.bio : [user.bio])
          .filter(Boolean)
          .map((line, i) => (
            <p key={i}>{line}</p>
          ))}
      </div>

      {/* ----------- SKILLS ---------------- */}
      <div className="middle-section">
        {isSelfProfile && (
          <div className="top-edit" onClick={() => handleEdit("skills")}>
            ✏️
          </div>
        )}
        <h3>Skills</h3>

        <ul className="skills-list">
          {user.skills?.map((skill, i) => (
            <li key={i}>{skill}</li>
          ))}
        </ul>
      </div>

      {/* ----------- MEDIA ---------------- */}
      <div className="media-section">
        {isSelfProfile && (
          <div className="top-edit" onClick={() => handleEdit("media")}>
            ✏️
          </div>
        )}

        <h3>Main Work</h3>

        {user.media
          ?.sort((a, b) => a.priority - b.priority)
          .map((project, i) => (
            <MediaCard key={i} project={project} getFullUrl={getFullUrl} />
          ))}

      </div>

      {/* EDIT MODAL */}
      {isSelfProfile && editingSection && (
        <EditModal
          section={editingSection}
          user={user}
          onSave={handleSave}
          onCancel={() => setEditingSection(null)}
        />
      )}
    </div>
  );
};

export default ProfilePage;
