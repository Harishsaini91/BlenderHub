import React, { useState, useEffect } from "react";
import LongTermTeamProject from "./LongTermTeamProject";
import EditLongTermProject from "./EditLongTermProject";
import { fetchMyProjects, deleteTeamProject } from "../projectApi";
import "./longterm_project_modal.css";

const LongTermProjectWrapper = ({ user, onClose }) => {
  const [mode, setMode] = useState("list");
  const [projects, setProjects] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);

  const token =
    user?.token ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await fetchMyProjects(token);
      if (res?.data?.success) setProjects(res.data.projects || []);
    } catch (err) {
      console.error("Load projects error:", err);
      alert("Failed to load your projects.");
    } finally {
      setLoading(false);
    }
  };

  // CREATE MODE
  if (mode === "create")
    return (
      <LongTermTeamProject
        user={user}
        onClose={() => {
          setMode("list");
          loadProjects();
        }}
      />
    );

  // EDIT MODE
  if (editing)
    return (
      <EditLongTermProject
        user={user}
        project={editing}
        onClose={() => {
          setEditing(null);
          loadProjects();
        }}
      />
    );



  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;

    try {
      const res = await deleteTeamProject(id, token);

      if (res.data.success) {
        alert("Project deleted successfully.");
        loadProjects();
      } else {
        alert(res.data.message || "Delete failed.");
      }
    } catch (err) {
      console.error("Delete project error:", err);
      alert("Server error while deleting project.");
    }
  };




  // LIST MODE
  return (
    <div className="longterm-overlay">
      <div className="longterm-modal wide">

        <div className="lt-header">
          <h2>Your Long-Term Projects</h2>

          <div className="lt-header-actions">
            <button className="mode-btn" onClick={() => setMode("create")}>
              + New Team Project
            </button>

            <button className="mode-btn" onClick={loadProjects} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Project cards */}
        <div className="lt-project-list better-grid">
          {projects.length === 0 ? (
            <p className="muted">No long-term work created yet.</p>
          ) : (
            projects.map((p) => (
              <div className="project-card fancy-card" key={p._id}>

                {/* Title */}
                <h3 className="project-title">{p.teamName}</h3>

                {/* Bio */}
                <p className="project-bio">
                  {(p.bio || "").slice(0, 150)}...
                </p>

                {/* Tags */}
                {p.tags?.length > 0 && (
                  <div className="tag-row">
                    {p.tags.map((t, i) => (
                      <span className="tag" key={i}>{t}</span>
                    ))}
                  </div>
                )}

                {/* Members */}
                <div className="member-row">
                  {p.members?.slice(0, 5).map((m, i) => (
                    <div className="member-badge" key={i}>
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt="" />
                      ) : (
                        <span>{m.name?.charAt(0) || "?"}</span>
                      )}
                    </div>
                  ))}
                  {p.members?.length > 5 && (
                    <span className="member-more">+{p.members.length - 5}</span>
                  )}
                </div>

                {/* GitHub repo */}
                {p.repo?.url && (
                  <a
                    href={p.repo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="github-link"
                  >
                    🔗 GitHub Repo
                  </a>
                )}

                {/* Media Preview */}
                {p.projects?.length > 0 && p.projects[0].media?.length > 0 && (
                  <div className="media-preview-grid">
                    {p.projects[0].media.slice(0, 3).map((m, i) => (
                      <img
                        key={i}
                        src={`http://localhost:5000${m}`}
                        className="media-thumb"
                        alt=""
                      />
                    ))}
                  </div>
                )}

                {/* Last Updated */}
                <small className="last-updated">
                  Updated: {new Date(p.updatedAt).toLocaleDateString()}
                </small>

                {/* Actions */}
                <div className="project-actions">
                  <button className="edit-btn" onClick={() => setEditing(p)}>Edit</button>

                  <button className="delete-btn" onClick={() => handleDelete(p._id)}>
                    Delete
                  </button>

                </div>


              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LongTermProjectWrapper;
