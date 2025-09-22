import React, { useEffect, useState } from "react";
import axios from "axios";
import "./ProfilePage.css";
import EditModal from './EditModal';

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

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [editingSection, setEditingSection] = useState(null);

  // Load from session → local → DB → dummy
  useEffect(() => {
    const sessionData = sessionStorage.getItem("user");
    const localData = localStorage.getItem("user");

    const init = async () => {
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
  }, []);

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
      {/* Banner + Basic Info */}
      <div
        className="banner-section"
        style={{
          backgroundImage: `url(http://localhost:5000/uploads/banner/${user.banner})`,
        }}
      >
        <div className="top-edit" onClick={() => handleEdit("basic")}>✏️</div>

        <div className="profile-image">
          <img
            src={`http://localhost:5000/uploads/image/${user.image}`}
            alt="User"
          />
        </div>

        <div className="info">
          <h2>{user.name}</h2>

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


      {/* Skills Section */}
      <div className="middle-section">
        <div className="top-edit" onClick={() => handleEdit("skills")}>✏️</div>
        <h3>Skills</h3>
        <ul className="skills-list">
          {user.skills?.map((skill, i) => (
            <li key={i}>{skill}</li>
          ))}
        </ul>
      </div>

      {/* Media Section */}
      <div className="media-section">
        <div className="top-edit" onClick={() => handleEdit("media")}>✏️</div>
        <h3>Main Work</h3>

        {user.media?.sort((a, b) => a.priority - b.priority).map((project, i) => (
          <div key={i} className="media-project">
            <h4>{project.title || "Untitled Project"}</h4>
            <p>{project.description || "No description."}</p>
            <div className="media-files">
              {project.files?.sort((a, b) => a.priority - b.priority).map((file, j) => {
                const mediaUrl = `http://localhost:5000/uploads/media/${file.url}`;
                return file.type === "image" ? (
                  <img key={j} src={mediaUrl} alt={`media-${j}`} style={{ width: "120px", marginRight: "10px" }} />
                ) : (
                  <video key={j} controls src={mediaUrl} style={{ width: "160px", marginRight: "10px" }} />
                );
              })}
            </div>
          </div>
        ))}
      </div>






      {/* Edit Modal */ }
  {
    editingSection && (
      <EditModal
        section={editingSection}
        user={user}
        onSave={(data) => handleSave(data)}
        onCancel={() => setEditingSection(null)}
      />
    )
  }
    </div >
  );
};

export default ProfilePage;
