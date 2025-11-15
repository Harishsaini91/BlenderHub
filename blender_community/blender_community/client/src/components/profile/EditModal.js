import React, { useState, useEffect } from "react";
import "assets/styles/components/EditModal.css";

const EditModal = ({ section, user, onSave, onCancel }) => {
  const [form, setForm] = useState({ ...user });
  const [mediaIndex, setMediaIndex] = useState(null);
  const [newSkill, setNewSkill] = useState("");
  const [location, setlocation] = useState("");
  const [role, setrole] = useState("");
  const [bannerFile, setBannerFile] = useState(null);
  const [previewBannerUrl, setPreviewBannerUrl] = useState("");
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [tempDeletedFiles, setTempDeletedFiles] = useState([]);

  useEffect(() => {
    if (section === "media") {
      setTempDeletedFiles([]);
    }
  }, [mediaIndex]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setBannerFile(file);
    const previewUrl = URL.createObjectURL(file);
    setPreviewBannerUrl(previewUrl);

    const formData = new FormData();
    formData.append("banner", file);

    try {
      const res = await fetch("http://localhost:5000/api/upload_image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.filename) {
        setForm((prev) => ({ ...prev, banner: data.filename }));
      }
    } catch (err) {
      console.error("Banner upload failed:", err);
    }
  };

  const handleMediaFileUpload = async (files) => {
    const newFiles = Array.from(files);

    const formData = new FormData();
    newFiles.forEach((file) => {
      formData.append("media", file);
    });

    try {
      const res = await fetch("http://localhost:5000/api/upload_image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!data.files || !Array.isArray(data.files)) {
        console.error("Unexpected upload response:", data);
        return;
      }

      const uploadedFiles = data.files.map((fileObj, i) => ({
        url: fileObj.filename,
        type: fileObj.filename.endsWith(".mp4") || fileObj.filename.endsWith(".webm") ? "video" : "image",
        priority: i,
        temp: true
      }));

      setForm((prevForm) => {
        const mediaCopy = [...(prevForm.media || [])];
        if (!mediaCopy[mediaIndex]) return prevForm;

        const existingUrls = new Set((mediaCopy[mediaIndex].files || []).map(f => f.url));
        const newUnique = uploadedFiles.filter(f => !existingUrls.has(f.url));

        mediaCopy[mediaIndex].files = [...(mediaCopy[mediaIndex].files || []), ...newUnique];
        return { ...prevForm, media: mediaCopy };
      });
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };

  const handleSkillAdd = () => {
    if (newSkill.trim()) {
      setForm({ ...form, skills: [...(form.skills || []), newSkill.trim()] });
      setNewSkill("");
    }
  };

  const handleSkillDelete = (index) => {
    const updated = [...form.skills];
    updated.splice(index, 1);
    setForm({ ...form, skills: updated });
  };

  const handleMediaPriorityUp = (index) => {
    if (index === 0) return;
    const mediaList = [...form.media];
    [mediaList[index - 1], mediaList[index]] = [mediaList[index], mediaList[index - 1]];
    mediaList.forEach((m, i) => (m.priority = i));
    setForm({ ...form, media: mediaList });
  };

  const handleMediaEdit = (index) => setMediaIndex(index);

  const handleMediaDelete = (index) => {
    if (window.confirm("Delete this project?")) {
      const updated = [...form.media];
      updated.splice(index, 1);
      updated.forEach((m, i) => (m.priority = i));
      setForm({ ...form, media: updated });
      setMediaIndex(null);
    }
  };

  const handleMediaUpdate = (key, value) => {
    const updated = [...form.media];
    updated[mediaIndex][key] = value;
    setForm({ ...form, media: updated });
  };

  const handleMediaFileDelete = (fileIndex) => {
    const updated = [...form.media];
    const fileToRemove = updated[mediaIndex].files[fileIndex];
    updated[mediaIndex].files.splice(fileIndex, 1);
    setTempDeletedFiles((prev) => [...prev, fileToRemove]);
    setForm({ ...form, media: updated });
  };

  const handleAddNewMedia = () => {
    const newMedia = {
      title: "",
      description: "",
      files: [],
      priority: form.media?.length || 0,
    };
    setForm({ ...form, media: [...(form.media || []), newMedia] });
    setMediaIndex(form.media?.length || 0);
  };

  const handleSubmit = () => {
    const updatedSection = {};
    if (section === "basic") {
      updatedSection.name = form.name?.trim();
      updatedSection.bio = form.bio || [];
      updatedSection.linkedin = form.linkedin;
      updatedSection.location = form.location;
      updatedSection.role = form.role;
      updatedSection.github = form.github;
      updatedSection.banner = form.banner;
    }
    if (section === "skills") {
      updatedSection.skills = form.skills?.filter((s) => s.trim());
    }
    if (section === "media") {
      updatedSection.media = form.media.map(project => ({
        ...project,
        files: project.files?.filter(f => !tempDeletedFiles.some(d => d.url === f.url)) || []
      }));
    }

    updatedSection._id = user._id;
    updatedSection.email = user.email;
    updatedSection.image = user.image;

    onSave(updatedSection);
  };

  return (
    <div className="edit-modal">
      <div className="modal-content">
        <h3>Edit: {section}</h3>

        {section === "basic" && (
          <>
            <label>Name</label>
            <input name="name" value={form.name} onChange={handleChange} />
            <label>location</label>
            <input name="location" value={form.location} onChange={handleChange} />
            <label>Role</label>
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="beginner">Beginner</option>
              <option value="student">Student</option>
              <option value="pro">Pro</option>
            </select>

            <label>Bio</label>
            <textarea name="bio" value={form.bio} onChange={handleChange} />

            <label>LinkedIn</label>
            <input name="linkedin" value={form.linkedin} onChange={handleChange} />

            <label>GitHub</label>
            <input name="github" value={form.github} onChange={handleChange} />

            <label>Banner</label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
            {previewBannerUrl && <img src={previewBannerUrl} alt="Preview" width="200" />}
          </>
        )}

        {section === "skills" && (
          <>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} />
              <button onClick={handleSkillAdd}>Add</button>
            </div>
            <ul>
              {form.skills?.map((s, i) => (
                <li key={i}>
                  {s} <button onClick={() => handleSkillDelete(i)}>❌</button>
                </li>
              ))}
            </ul>
          </>
        )}

        {section === "media" && (
          <>
            {mediaIndex === null ? (
              <>
                <button onClick={handleAddNewMedia}>➕ Add New</button>
                {(form.media || []).map((m, i) => (
                  <div key={i}>
                    <strong>({m.priority}) {m.title}</strong>
                    <button onClick={() => handleMediaPriorityUp(i)}>⬆</button>
                    <button onClick={() => handleMediaEdit(i)}>✏️ Edit</button>
                    <button onClick={() => handleMediaDelete(i)}>🗑️ Delete</button>
                  </div>
                ))}
              </>
            ) : (
              <>
                <label>Title</label>
                <input value={form.media[mediaIndex].title} onChange={(e) => handleMediaUpdate("title", e.target.value)} />

                <label>Description</label>
                <textarea value={form.media[mediaIndex].description} onChange={(e) => handleMediaUpdate("description", e.target.value)} />

                <label>Upload Media</label>
                <input type="file" multiple accept="image/*,video/*" onChange={(e) => handleMediaFileUpload(e.target.files)} />

                {(form.media[mediaIndex].files || []).map((file, i) => {
                  const url = `http://localhost:5000/uploads/media/${file.url}`;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span>#{i}</span>
                      {file.type === "video" ? (
                        <video src={url} width="80" controls />
                      ) : (
                        <img src={url} width="80" alt="media" />
                      )}
                      <button onClick={() => handleMediaFileDelete(i)}>❌</button>
                    </div>
                  );
                })}
                <button onClick={() => setMediaIndex(null)}>Done</button>
              </>
            )}
          </>
        )}

        <br />
        <div className="modal-actions">
          <button onClick={handleSubmit}>✅ Save</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>


    </div>
  );
};
export default EditModal;
