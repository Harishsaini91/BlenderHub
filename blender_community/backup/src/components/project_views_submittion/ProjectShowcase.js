// src/components/ProjectShowcase.js
import React, { useEffect, useState } from "react";
import "./ProjectShowcase.css";
import { FaHeart, FaEye, FaComment, FaGithub, FaLink } from "react-icons/fa";

const mockProjects = [
  // Example project objects
];

const ProjectShowcase = () => {
  const [projects, setProjects] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [viewMode, setViewMode] = useState("all"); // all, images, videos
  const [activeComments, setActiveComments] = useState(null);

  useEffect(() => {
    // Fetch projects from API here
    const sorted = [...mockProjects].sort((a, b) => new Date(b.date) - new Date(a.date));
    setProjects(sorted);
    setFiltered(sorted);
  }, []);

  useEffect(() => {
    let updated = [...projects];

    // Filter by view mode
    if (viewMode === "images") updated = updated.filter(p => p.images?.length);
    if (viewMode === "videos") updated = updated.filter(p => p.videos?.length);

    // Search filter
    if (searchQuery.trim()) {
      updated = updated.filter(
        p =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sorting
    if (filter === "new") updated.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (filter === "old") updated.sort((a, b) => new Date(a.date) - new Date(b.date));
    if (filter === "liked") updated.sort((a, b) => b.likes - a.likes);

    setFiltered(updated);
  }, [searchQuery, filter, viewMode, projects]);

  const toggleComments = (projectId) => {
    setActiveComments((prev) => (prev === projectId ? null : projectId));
  };

  const renderMedia = (project) => {
    return (
      <div className="media-wrapper">
        {project.images?.map((img, i) => (
          <img key={i} src={img} alt="project media" className="media-thumb" />
        ))}
        {project.videos?.map((vid, i) => (
          <video key={i} controls className="media-thumb">
            <source src={vid} type="video/mp4" />
          </video>
        ))}
      </div>
    );
  };

  return (
    <div className="project-showcase">
      {/* Top Navbar */}
      <div className="top-bar">
        <div className="left-tools">
          <button onClick={() => setViewMode("images")}>View Images</button>
          <button onClick={() => setViewMode("videos")}>View Videos</button>
          <button onClick={() => setViewMode("all")}>All</button>
        </div>

        <div className="filters">
          <button onClick={() => setFilter("new")}>Newest</button>
          <button onClick={() => setFilter("old")}>Oldest</button>
          <button onClick={() => setFilter("liked")}>Most Liked</button>
          {filter && <button onClick={() => setFilter("")} className="clear-btn">Clear Filter</button>}
        </div>

        <input
          className="searchbar"
          placeholder="Search by title or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="projects-container">
        {filtered.map((project) => (
          <div key={project._id} className="project-card">
            <div className="user-info">
              <img src={project.user.image} alt="user" className="user-img" />
              <span className="username">{project.user.name}</span>
              <div className="links">
                {project.links.github && (
                  <a href={project.links.github} target="_blank"><FaGithub /></a>
                )}
                {project.links.live && (
                  <a href={project.links.live} target="_blank"><FaLink /></a>
                )}
              </div>
            </div>

            <h3>{project.title}</h3>
            <p>{project.description}</p>

            {renderMedia(project)}

            <div className="stats">
              <span><FaHeart /> {project.likes}</span>
              <span><FaEye /> {project.views}</span>
              <span onClick={() => toggleComments(project._id)} className="comment-toggle">
                <FaComment /> {project.comments.length}
              </span>
            </div>

            {activeComments === project._id && (
              <div className="comments-section">
                <input
                  placeholder="Write a comment..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target.value.trim()) {
                      const newComment = {
                        text: e.target.value,
                        author: "You",
                        date: new Date().toISOString(),
                      };
                      project.comments.unshift(newComment);
                      setFiltered([...filtered]);
                      e.target.value = "";
                    }
                  }}
                />
                <div className="comments-list">
                  {project.comments.map((c, i) => (
                    <div key={i} className="comment">
                      <strong>{c.author}</strong>
                      <span>{new Date(c.date).toLocaleString()}</span>
                      <p>{c.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectShowcase;
