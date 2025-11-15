// ✅ Updated UserProjects.jsx (no API call until Save in modal)
import React, { useEffect, useState } from "react";
import axios from "axios";
import ProjectFormModal from "./ProjectFormModal";
import "assets/styles/components/UserProjects.css";

const UserProjects = () => {
  const storedUser = JSON.parse(
    localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"
  );
  const userId = storedUser._id;

  const [projects, setProjects] = useState([]);
  const [collectionId, setCollectionId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProjects = async () => {
    if (!userId || userId === "null") return;

    try {
      const res = await axios.get(`http://localhost:5000/api/projects/${userId}`);
      setProjects(res.data.projects || []);
      setCollectionId(res.data.collectionId);
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };


  useEffect(() => {
    if (userId && userId !== "null") {
      fetchProjects();
    } else {
      console.warn("⚠️ No valid userId found in localStorage.");
    }
  }, [userId]);


  const deleteProject = async (projectId) => {
    if (!collectionId || !window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/projects/${collectionId}/${projectId}`);
      setProjects(projects.filter((p) => p._id !== projectId));
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const openCreatePanel = () => {
    setEditProject(null);
    setShowForm(true);
  };

  const openEditPanel = (project) => {
    setEditProject(project);
    setShowForm(true);
  };

  const filteredProjects = projects.filter((p) =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="user-projects">
      <header className="navbar">
        <input
          type="text"
          placeholder="Search your projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button onClick={openCreatePanel}>➕ Add Project</button>
      </header>

      {showForm && (
        <ProjectFormModal
          userId={userId}
          existingProject={editProject}
          collectionId={collectionId}
          onClose={() => setShowForm(false)}
          onSave={fetchProjects} // ✅ re-fetch after Save
        />
      )}

      <div className="project-list">
        {filteredProjects.length === 0 ? (
          <p>No projects found.</p>
        ) : (
          filteredProjects.map((project) => (
            <div className="project-card" key={project._id}>
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <div className="media-section">
                {project.media.map((m, i) => (
                  <div key={i} className="media">
                    {m.type === "image" ? (
                      <img src={m.url} alt="" width={120} />
                    ) : (
                      <video src={m.url} width={140} controls />
                    )}
                    <p>Priority: {m.priority}</p>
                  </div>
                ))}
              </div>
              <div className="actions">
                <button onClick={() => openEditPanel(project)}>✏️ Edit</button>
                <button onClick={() => deleteProject(project._id)}>🗑️ Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserProjects;