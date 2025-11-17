// ✅ Updated ProjectFormModal.jsx (Priority removed + Carousel added)
import React, { useState, useEffect } from "react";
import axios from "axios";
import "assets/styles/components/ProjectFormModal.css";

const CATEGORY_OPTIONS = ["Modeling", "Animation", "Photography", "Design"];
const STATUS_OPTIONS = ["draft", "published"];
const VISIBILITY_OPTIONS = ["public", "private", "unlisted"];

const ProjectFormModal = ({ userId, existingProject, collectionId, onClose, onSave }) => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Modeling",
    keywords: "",
    status: "published",
    visibility: "public",
  });

  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreview, setMediaPreview] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [bigPreview, setBigPreview] = useState(null);

  useEffect(() => {
    if (existingProject) {
      setForm({
        title: existingProject.title || "",
        description: existingProject.description || "",
        category: existingProject.category?.[0] || "",
        keywords: (existingProject.keywords || []).join(", "),
        status: existingProject.status || "published",
        visibility: existingProject.visibility || "public",
      });

      setMediaPreview(existingProject.media || []);
    }
  }, [existingProject]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setMediaFiles(files);

    const previews = files.map((file) => ({
      file,
      type: file.type.includes("video") ? "video" : "image",
      url: URL.createObjectURL(file)
    }));

    setMediaPreview(previews);
  };

  const uploadMedia = async () => {
    const uploaded = [];
    for (let file of mediaFiles) {
      const fd = new FormData();
      fd.append("media", file);
      const res = await axios.post("http://localhost:5000/api/projects/upload", fd);
      uploaded.push({
        url: res.data.url,
        type: res.data.type,
      });
    }
    return uploaded;
  };

  const handleSubmit = async () => {
    if (!form.title) return alert("Title required.");

    try {
      const user = JSON.parse(sessionStorage.getItem("user")) || JSON.parse(localStorage.getItem("user"));

      const uploadedMedia = await uploadMedia();

      const payload = {
        ...form,
        keywords: form.keywords.split(",").map(v => v.trim()),
        category: [form.category],
        media: uploadedMedia.length ? uploadedMedia : mediaPreview,
        userId: user._id,
      };

      if (existingProject) {
        await axios.put(`http://localhost:5000/api/projects/${collectionId}/${existingProject._id}`, payload);
      } else {
        await axios.post("http://localhost:5000/api/projects/create", payload);
      }

      onSave();
      onClose();
    } catch (err) {
      console.error("Save failed", err);
      alert("Save failed");
    }
  };

  const nextImage = () =>
    setCarouselIndex((prev) => (prev + 1) % mediaPreview.length);

  const prevImage = () =>
    setCarouselIndex((prev) =>
      prev === 0 ? mediaPreview.length - 1 : prev - 1
    );

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{existingProject ? "Edit Project" : "Create New Project"}</h2>

        {previewMode ? (
          <div className="preview-mode">
            <h3>{form.title}</h3>
            <p>{form.description}</p>

            {/* Carousel */}
            {mediaPreview.length > 0 && (
              <>
                {/* IMAGE / VIDEO */}
                <div
                  className="carousel-display"
                  onClick={() => setBigPreview(mediaPreview[carouselIndex])}
                >
                  {mediaPreview[carouselIndex].type === "image" ? (
                    <img src={mediaPreview[carouselIndex].url} />
                  ) : (
                    <video src={mediaPreview[carouselIndex].url} controls />
                  )}
                </div>

                {/* CONTROLS BELOW */}
                <div className="carousel-controls">
                  <button onClick={prevImage}>⬅ Prev</button>

                  <span className="carousel-counter">
                    {carouselIndex + 1} / {mediaPreview.length}
                  </span>

                  <button onClick={nextImage}>Next ➡</button>
                </div>
              </>
            )}

            <button onClick={() => setPreviewMode(false)}>🔙 Back</button>
          </div>
        ) : (

          <>
            <input name="title" placeholder="Project Title" value={form.title} onChange={handleChange} />

            <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} />

            <label>
              Category:
              <input list="category-list" name="category" value={form.category} onChange={handleChange} />
              <datalist id="category-list">
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c} />)}
              </datalist>
            </label>

            <input name="keywords" placeholder="Keywords (comma separated)" value={form.keywords} onChange={handleChange} />

            <input type="file" accept="image/*,video/*" multiple onChange={handleFileChange} />

            {/* Inline preview */}
            <div className="carousel-horizontal">
              {mediaPreview.map((m, i) =>
                m.type === "image" ? (
                  <img key={i} src={m.url} width={80} onClick={() => setCarouselIndex(i)} />
                ) : (
                  <video key={i} src={m.url} width={80} onClick={() => setCarouselIndex(i)} />
                )
              )}
            </div>

            <div className="modal-buttons">
              <button onClick={() => setPreviewMode(true)}>👁 Preview</button>
              <button onClick={handleSubmit}>💾 Save</button>
              <button onClick={onClose}>❌ Cancel</button>
            </div>
          </>
        )}

        {/* Big Preview Modal */}
        {bigPreview && (
          <div className="big-preview" onClick={() => setBigPreview(null)}>
            {bigPreview.type === "image" ? (
              <img src={bigPreview.url} />
            ) : (
              <video src={bigPreview.url} controls />
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default ProjectFormModal;
