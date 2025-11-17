// ✅ FULLY FIXED UserProjects.jsx – Safe Carousel, No Crashes, Perfect UI
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
  const [bigPreview, setBigPreview] = useState(null);

  // 🔥 mediaIndexes: store index per project
  const [mediaIndexes, setMediaIndexes] = useState({}); // { projectId: index }

  const fetchProjects = async () => {
    if (!userId) return;
    try {
      const res = await axios.get(`http://localhost:5000/api/projects/${userId}`);
      const loadedProjects = res.data.projects || [];
      setProjects(loadedProjects);
      setCollectionId(res.data.collectionId);

      // Initialize index for each project
      const initialIndexes = {};
      loadedProjects.forEach((p) => {
        initialIndexes[p._id] = 0;
      });
      setMediaIndexes(initialIndexes);

    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };

  useEffect(() => {
    if (userId) fetchProjects();
  }, [userId]);

  const deleteProject = async (projectId) => {
    if (!collectionId || !window.confirm("Delete this project?")) return;
    await axios.delete(
      `http://localhost:5000/api/projects/${collectionId}/${projectId}`
    );

    fetchProjects();
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

  // 🔥 Carousel controls
  const nextMedia = (projectId, total) => {
    setMediaIndexes((prev) => ({
      ...prev,
      [projectId]: (prev[projectId] + 1) % total,
    }));
  };

  const prevMedia = (projectId, total) => {
    setMediaIndexes((prev) => ({
      ...prev,
      [projectId]: prev[projectId] === 0 ? total - 1 : prev[projectId] - 1,
    }));
  };

  return (
    <div className="user-projects">
      {/* Navbar */}
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
          onSave={fetchProjects}
        />
      )}

      <div className="project-list">
        {filteredProjects.length === 0 ? (
          <p>No projects found.</p>
        ) : (
          filteredProjects.map((project) => {
            const total = project.media?.length || 0;
            const index = mediaIndexes[project._id] ?? 0;

            // 🛡 FIX: If NO media → Show box instead of crashing
            if (total === 0) {
              return (
                <div className="project-card" key={project._id}>
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>

                  <div className="no-media-box">No media available</div>

                  <div className="actions">
                    <button onClick={() => openEditPanel(project)}>✏️ Edit</button>
                    <button onClick={() => deleteProject(project._id)}>🗑️ Delete</button>
                  </div>
                </div>
              );
            }

            // 🛡 FIX: Ensure index always valid
            const safeIndex = index >= total ? 0 : index;
            const selectedMedia = project.media[safeIndex];

            // 🛡 FIX: Double-check selectedMedia
            if (!selectedMedia) return null;

            return (
              <div className="project-card" key={project._id}>
                <h3>{project.title}</h3>
                <p>{project.description}</p>

                {/* Carousel */}
                <div className="carousel">

                  {/* MAIN IMAGE BOX */}
                  <div
                    className="carousel-display"
                    onClick={() => setBigPreview(selectedMedia)}
                  >
                    {selectedMedia.type === "image" ? (
                      <img src={selectedMedia.url} alt="media" />
                    ) : (
                      <video src={selectedMedia.url} controls />
                    )}
                  </div>

                  {/* CONTROLS BELOW */}
                  <div className="carousel-controls">
                    <button onClick={() => prevMedia(project._id, total)}>⬅ Prev</button>

                    <span className="carousel-counter">
                      {safeIndex + 1} / {total}
                    </span>

                    <button onClick={() => nextMedia(project._id, total)}>Next ➡</button>
                  </div>
                </div>

                {/* Actions */}
                <div className="actions">
                  <button onClick={() => openEditPanel(project)}>✏️ Edit</button>
                  <button onClick={() => deleteProject(project._id)}>🗑️ Delete</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* BIG Preview */}
      {bigPreview && (
        <div className="big-preview" onClick={() => setBigPreview(null)}>
          {bigPreview.type === "image" ? (
            <img src={bigPreview.url} alt="preview" />
          ) : (
            <video src={bigPreview.url} controls />
          )}
        </div>
      )}
    </div> 
  );
};
 
export default UserProjects;
