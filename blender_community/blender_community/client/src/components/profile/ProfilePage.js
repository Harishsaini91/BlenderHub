import React, { useEffect, useState } from "react";
import axios from "axios";
import EditModal from './EditModal';

import { openChatWindow } from "../../utils/openChatWindow";
import "assets/styles/components/ProfilePage.css";



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

const mergeUserData = (base, override) => {
  const merged = { ...base };
  Object.keys(base).forEach(key => {
    if (override?.[key] !== undefined && override[key] !== null) {
      merged[key] = override[key];
    }
  });
  return merged;
};

// const ProfilePage = () => {
const ProfilePage = ({ userId = null, setProfileUserId = null }) => {
  const [user, setUser] = useState(null);
  const [editingSection, setEditingSection] = useState(null);

  // Viewer (logged-in user)
  const loggedInUser = JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "{}");
  const loggedInUserId = loggedInUser?._id;

  // 🔹 Check if viewing self or another user
  const isSelfProfile = !userId || userId === loggedInUserId;

   

  useEffect(() => {
    const init = async () => {
      // ✅ CASE 1: Viewing someone else's profile (read-only)
      if (userId) {
        try {
          const res = await axios.get(`http://localhost:5000/api/user/${userId}`);
          if (res.data?.user) {
            setUser(res.data.user);
          } else {
            console.warn("User not found for ID:", userId);
            setUser(DUMMY_USER);
          }
        } catch (err) {
          console.error("Error fetching other user profile:", err);
          setUser(DUMMY_USER);
        }
        return;
      }

      // ✅ CASE 2: Viewing your own profile (editable)
      const sessionData = sessionStorage.getItem("user");
      const localData = localStorage.getItem("user");

      if (sessionData) {
        setUser(JSON.parse(sessionData));
      } else if (localData) {
        setUser(JSON.parse(localData));
        sessionStorage.setItem("user", localData);
      } else {
        try {
          const res = await axios.get("http://localhost:5000/api/me");
          if (res.data?.user) {
            const fullUser = mergeUserData(DUMMY_USER, res.data.user);
            const json = JSON.stringify(fullUser);
            sessionStorage.setItem("user", json);
            localStorage.setItem("user", json);
            setUser(fullUser);
          } else {
            setUser(DUMMY_USER);
          }
        } catch {
          setUser(DUMMY_USER);
        }
      }
    };

    init();
  }, [userId]);



  const handleEdit = (section) => {
    setEditingSection(section);
  };

  const handleSave = async (updatedPartial) => {
    const updatedUser = { ...user, ...updatedPartial };
    setUser(updatedUser);

    const json = JSON.stringify(updatedUser);
    sessionStorage.setItem("user", json);
    localStorage.setItem("user", json);

    try {
      const res = await axios.post("http://localhost:5000/api/update-profile", updatedUser);
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

return (
  <div className="profile-container">

    {/* Back Button for other profiles */}
    {userId && setProfileUserId && (
      <button
        onClick={() => setProfileUserId(null)}
        className="back-btn"
      >
        ← Back to Connections
      </button>
    )}

    {/* ▬▬▬▬▬▬ BANNER ▬▬▬▬▬▬ */}
    <div
      className="banner-section"
      style={{
        backgroundImage: `url(http://localhost:5000/uploads/banner/${user.banner})`,
      }}
    >
      {isSelfProfile && (
        <div className="top-edit" onClick={() => handleEdit("basic")}>✏️</div>
      )}

      {/* Profile Image (overlapping) */}
      <div className="profile-image">
        <img
          src={`http://localhost:5000/uploads/image/${user.image}`}
          alt="User"
        />
      </div>
    </div>

    {/* ▬▬▬▬▬▬ USER INFO CARD (Name, Social, Chat) ▬▬▬▬▬▬ */}
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

      {/* SOCIAL LINKS */}
      <div className="icons">
        {(Array.isArray(user.linkedin) ? user.linkedin : [user.linkedin])
          .filter(Boolean)
          .map((link, i) => (
            <a
              key={i}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
            >
              🔗 LinkedIn {i + 1}
            </a>
          ))}

        {(Array.isArray(user.github) ? user.github : [user.github])
          .filter(Boolean)
          .map((link, i) => (
            <a
              key={i}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
            >
              💻 GitHub {i + 1}
            </a>
          ))}
      </div>
    </div>

    {/* ▬▬▬▬▬▬ BIO SECTION — NEW CLEAN BLOCK ▬▬▬▬▬▬ */}
    <div className="bio-section">
      {(Array.isArray(user.bio) ? user.bio : [user.bio])
        .filter(Boolean)
        .map((line, i) => (
          <p key={i}>{line}</p>
        ))}
    </div>

    {/* ▬▬▬▬▬▬ SKILLS ▬▬▬▬▬▬ */}
    <div className="middle-section">
      {isSelfProfile && (
        <div className="top-edit" onClick={() => handleEdit("skills")}>✏️</div>
      )}
      <h3>Skills</h3>

      <ul className="skills-list">
        {user.skills?.map((skill, i) => (
          <li key={i}>{skill}</li>
        ))}
      </ul>
    </div>

    {/* ▬▬▬▬▬▬ MEDIA SECTION ▬▬▬▬▬▬ */}
    <div className="media-section">
      {isSelfProfile && (
        <div className="top-edit" onClick={() => handleEdit("media")}>✏️</div>
      )}

      <h3>Main Work</h3>

      {user.media
        ?.sort((a, b) => a.priority - b.priority)
        .map((project, i) => (
          <div key={i} className="media-project">
            <h4>{project.title || "Untitled Project"}</h4>
            <p>{project.description || "No description."}</p>

            <div className="media-files">
              {project.files
                ?.sort((a, b) => a.priority - b.priority)
                .map((file, j) => {
                  const mediaUrl = `http://localhost:5000/uploads/media/${file.url}`;
                  return file.type === "image" ? (
                    <img
                      key={j}
                      src={mediaUrl}
                      alt={`media-${j}`}
                    />
                  ) : (
                    <video
                      key={j}
                      controls
                      src={mediaUrl}
                    />
                  );
                })}
            </div>
          </div>
        ))}
    </div>

    {/* EDIT MODAL */}
    {isSelfProfile && editingSection && (
      <EditModal
        section={editingSection}
        user={user}
        onSave={(data) => handleSave(data)}
        onCancel={() => setEditingSection(null)}
      />
    )}
  </div>
);

}

export default ProfilePage;

