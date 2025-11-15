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

  // Load from session → local → DB → dummy
  // useEffect(() => {
  //   const sessionData = sessionStorage.getItem("user");
  //   const localData = localStorage.getItem("user");

  //   const init = async () => {
  //     if (sessionData) {
  //       setUser(JSON.parse(sessionData));
  //     } else if (localData) {
  //       setUser(JSON.parse(localData));
  //       sessionStorage.setItem("user", localData);
  //     } else {
  //       try {
  //         const res = await axios.get("http://localhost:5000/api/me");
  //         if (res.data?.user) {
  //           const fullUser = mergeUserData(DUMMY_USER, res.data.user);
  //           const json = JSON.stringify(fullUser);
  //           sessionStorage.setItem("user", json);
  //           localStorage.setItem("user", json);
  //           setUser(fullUser);
  //         } else {
  //           setUser(DUMMY_USER);
  //         }
  //       } catch {
  //         setUser(DUMMY_USER);
  //       }
  //     }
  //   };

  //   init();
  // }, []);

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
      {/* ✅ Optional back button for other profiles */}
      {userId && setProfileUserId && (
        <button
          onClick={() => setProfileUserId(null)}
          style={{
            background: "#444",
            color: "white",
            padding: "8px 12px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            marginBottom: "10px",
          }}
        >
          ← Back to Connections
        </button>
      )}

      {/* ✅ Banner + Basic Info */}
      <div
        className="banner-section"
        style={{
          backgroundImage: `url(http://localhost:5000/uploads/banner/${user.banner})`,
        }}
      >
        {/* Show edit only if it's the self-profile */}
        {isSelfProfile && (
          <div className="top-edit" onClick={() => handleEdit("basic")}>✏️</div>
        )}

        <div className="profile-image">
          <img
            src={`http://localhost:5000/uploads/image/${user.image}`}
            alt="User"
          />
        </div>

        <div className="info">
          <h2>{user.name}</h2>

          {/* ⭐ Chat button only when viewing other's profile */}
  {!isSelfProfile && (
  <button
    className="chat-start-btn"
    onClick={() => openChatWindow(user._id)}
  >
    💬 Chat
  </button>
)}



          {(Array.isArray(user.bio) ? user.bio : [user.bio])
            .filter(Boolean)
            .map((line, i) => (
              <p key={i}>{line}</p>
            ))}

          <div className="icons">
            {(Array.isArray(user.linkedin) ? user.linkedin : [user.linkedin])
              .filter(Boolean)
              .map((link, i) => (
                <a
                  key={`linkedin-${i}`}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🔗 LinkedIn #{i + 1}
                </a>
              ))}

            {(Array.isArray(user.github) ? user.github : [user.github])
              .filter(Boolean)
              .map((link, i) => (
                <a
                  key={`github-${i}`}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  💻 GitHub #{i + 1}
                </a>
              ))}
          </div>
        </div>
      </div>

      {/* ✅ Skills Section */}
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

      {/* ✅ Media Section */}
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
                        style={{ width: "120px", marginRight: "10px" }}
                      />
                    ) : (
                      <video
                        key={j}
                        controls
                        src={mediaUrl}
                        style={{ width: "160px", marginRight: "10px" }}
                      />
                    );
                  })}
              </div>
            </div>
          ))}
      </div>

      {/* ✅ Edit Modal - only for self */}
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

