import React, { useState, useEffect } from "react";
import axios from "axios";
import "./css/ProjectFormModal.css";

const CATEGORY_OPTIONS = ["Modeling", "Animation", "Photography", "Design"];
const STATUS_OPTIONS = ["draft", "published"];
const VISIBILITY_OPTIONS = ["public", "private", "unlisted"];

const ProjectFormModal = ({ userId, existingProject, collectionId, onClose, onSave }) => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    keywords: "",
    status: "published",
    visibility: "public",
    priority: 0,
    draft: false,
  });
  const [mediaFiles, setMediaFiles] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (existingProject) {
      setForm({
        title: existingProject.title || "",
        description: existingProject.description || "",
        category: existingProject.category?.[0] || "",
        keywords: (existingProject.keywords || []).join(", "),
        status: existingProject.status || "published",
        visibility: existingProject.visibility || "public",
        priority: existingProject.priority || 0,
        draft: existingProject.status === "draft"
      });
    }
  }, [existingProject]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    setMediaFiles(Array.from(e.target.files));
  };

  const uploadMedia = async () => {
    const uploaded = [];
    for (let i = 0; i < mediaFiles.length; i++) {
      const file = mediaFiles[i];
      const formData = new FormData();
      formData.append("media", file);
      const ext = file.name.split(".").pop().toLowerCase();
      const type = ["mp4", "mov"].includes(ext) ? "video" : "image";
      const res = await axios.post(`http://localhost:5000/api/projects/upload`, formData);
      uploaded.push({ url: res.data.url, type, priority: i + 1 });
    }
    return uploaded;
  };

  const handleSubmit = async () => {
    if (!form.title || !form.category) {
      return alert("Title and category are required.");
    }
    try {
      const media = await uploadMedia();
       const user = JSON.parse(sessionStorage.getItem("user")) || JSON.parse(localStorage.getItem("user"));
      const payload = {
        title: form.title,
        description: form.description,
        keywords: form.keywords.split(",").map((t) => t.trim()).filter(Boolean),
        category: [form.category],
        status: form.draft ? "draft" : form.status,
        visibility: form.visibility,
        priority: parseInt(form.priority) || 0,
        media,
        userId:user._id ,
      };

      console.log(payload);
      
      if (existingProject) {
        await axios.put(
          `http://localhost:5000/api/projects/${collectionId}/${existingProject._id}`,
          payload
        );
      } else {
        await axios.post(`http://localhost:5000/api/projects/create`, payload);
      }
      onSave();
      onClose();
    } catch (err) {
      console.error("Project save failed", err);
      alert("Save failed");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{existingProject ? "Edit Project" : "Create New Project"}</h2>

        {previewMode ? (
          <div className="preview-mode">
            <h3>{form.title}</h3>
            <p>{form.description}</p>
            {/* Media preview goes here */}
            <button onClick={() => setPreviewMode(false)}>🔙 Back</button>
          </div>
        ) : (
          <>
            <input
              name="title"
              placeholder="Project Title"
              value={form.title}
              onChange={handleChange}
              required
            />
            <textarea
              name="description"
              placeholder="Description"
              value={form.description}
              onChange={handleChange}
            />
            <label>
              Category:
              <input
                list="category-list"
                name="category"
                value={form.category}
                onChange={handleChange}
                required
              />
              <datalist id="category-list">
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>

            <label>
              Status:
              <input
                list="status-list"
                name="status"
                value={form.status}
                onChange={handleChange}
              />
              <datalist id="status-list">
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>

            <label>
              Visibility:
              <input
                list="visibility-list"
                name="visibility"
                value={form.visibility}
                onChange={handleChange}
              />
              <datalist id="visibility-list">
                {VISIBILITY_OPTIONS.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </label>

            <input
              name="keywords"
              placeholder="Keywords (comma separated)"
              value={form.keywords}
              onChange={handleChange}
            />

            <input
              type="number"
              name="priority"
              placeholder="Project Priority"
              value={form.priority}
              onChange={handleChange}
              min="0"
            />

            <input
              type="checkbox"
              name="draft"
              checked={form.draft}
              onChange={handleChange}
            />
            <span>Save as draft</span>

            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
            />

            <div className="modal-buttons">
              <button type="button" onClick={() => setPreviewMode(true)}>
                👁️ Preview
              </button>
              <button type="button" onClick={handleSubmit}>
                💾 Save
              </button>
              <button type="button" onClick={onClose}>
                ❌ Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectFormModal;
