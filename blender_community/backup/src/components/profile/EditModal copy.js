import React, { useState } from "react";

const EditModal = ({ section, user, onSave, onCancel }) => {
  const [form, setForm] = useState({ ...user });
  const [mediaIndex, setMediaIndex] = useState(null);
  const [newSkill, setNewSkill] = useState("");
  const [bannerFile, setBannerFile] = useState(null);
  const [previewBannerUrl, setPreviewBannerUrl] = useState("");
  const [mediaPreviews, setMediaPreviews] = useState([]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // const handleFileChange = (e) => {
  //   const file = e.target.files[0];
  //   setBannerFile(file);
  //   setForm({ ...form, banner: file.name });
  //   // setForm({ ...form, banner: URL.createObjectURL(file) });
  // };


  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setBannerFile(file); // still store file in state if needed

    // ✅ Show local preview
    const previewUrl = URL.createObjectURL(file);
    setPreviewBannerUrl(previewUrl);

    // Upload to server to get renamed filename
    const formData = new FormData();
    formData.append("banner", file);

    try {
      const res = await fetch("http://localhost:5000/api/upload_image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.filename) {
        setForm((prevForm) => ({
          ...prevForm,
          banner: data.filename, // ✅ server-renamed filename (not file.name)
        }));
      }
    } catch (err) {
      console.error("Banner upload failed:", err);
    }
  };


  const handleMediaFileDelete = async (projectIndex, fileIndex) => {
    const updated = [...form.media];

    if (!updated[projectIndex]) return; // ⛔ Prevent crash if undefined

    const files = [...(updated[projectIndex].files || [])];
    const [removed] = files.splice(fileIndex, 1); // remove selected file

    updated[projectIndex].files = files;
    setForm({ ...form, media: updated });

    // 🗑️ Optionally delete from server
    try {
      await fetch("http://localhost:5000/api/delete-media-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: removed.url }),
      });
    } catch (err) {
      console.error("Failed to delete file from server", err);
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
    if (window.confirm("Are you sure you want to delete this project?")) {
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


  // const handleMediaFileUpload = async (files) => {
  //    console.log("Uploading files:", files);
  //   const previewFiles = Array.from(files).map((file) => ({
  //     url: URL.createObjectURL(file),
  //     type: file.type.startsWith("video") ? "video" : "image",
  //   }));

  //   // show preview instantly
  //   setMediaPreviews(previewFiles);

  //   // upload files
  //   const formData = new FormData();
  //   Array.from(files).forEach(file => {
  //     formData.append("media", file);
  //   });

  //   try {
  //     const res = await fetch("http://localhost:5000/api/upload_image", {
  //       method: "POST",
  //       body: formData,
  //     });

  //     const data = await res.json();
  //     if (!data.files || !Array.isArray(data.files)) {
  //       console.error("Unexpected upload response:", data);
  //       return;
  //     }

  //     const uploadedFiles = data.files.map((fileObj, i) => ({
  //       url: fileObj.filename,
  //       type: fileObj.filename.endsWith(".mp4") || fileObj.filename.endsWith(".webm") ? "video" : "image",
  //       priority: i,
  //     }));

  //     // Save uploaded file info to form state
  //     setForm((prevForm) => {
  //       const mediaCopy = [...(prevForm.media || [])];

  //       if (!mediaCopy[mediaIndex]) return prevForm;

  //       const currentFiles = mediaCopy[mediaIndex].files || [];
  //       mediaCopy[mediaIndex].files = [...currentFiles, ...uploadedFiles];

  //       return {
  //         ...prevForm,
  //         media: mediaCopy,
  //       };
  //     });

  //     // Clear preview after upload success (optional)
  //     setMediaPreviews([]);
  //   } catch (err) {
  //     console.error("Upload failed:", err);
  //   }
  // };

  const handleMediaFileUpload = async (files) => {
    const fileArray = Array.from(files);

    // ✅ Temporary preview (do not save to form)
    setMediaPreviews(
      fileArray.map((file) => ({
        url: URL.createObjectURL(file),
        type: file.type.startsWith("video") ? "video" : "image",
      }))
    );

    // ✅ Upload to server
    const formData = new FormData();
    fileArray.forEach(file => {
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

      const uploadedFiles = data.files.map((fileObj) => ({
        url: fileObj.filename,
        type: fileObj.filename.endsWith(".mp4") || fileObj.filename.endsWith(".webm") ? "video" : "image",
      }));

      setForm((prevForm) => {
        const mediaCopy = [...(prevForm.media || [])];
        if (!mediaCopy[mediaIndex]) return prevForm;

        const currentFiles = mediaCopy[mediaIndex].files || [];

        // ✅ filter out duplicates
        const nonDuplicateFiles = uploadedFiles.filter(
          (file) => !currentFiles.some((f) => f.url === file.url)
        );

        mediaCopy[mediaIndex].files = [...currentFiles, ...nonDuplicateFiles];

        return {
          ...prevForm,
          media: mediaCopy,
        };
      });

      // ✅ Save uploaded file info only
      setForm((prevForm) => {
        const mediaCopy = [...(prevForm.media || [])];

        if (!mediaCopy[mediaIndex]) return prevForm;

        const currentFiles = mediaCopy[mediaIndex].files || [];
        mediaCopy[mediaIndex].files = [...currentFiles, ...uploadedFiles];

        return {
          ...prevForm,
          media: mediaCopy,
        };
      });

      setMediaPreviews([]); // Optional: clear preview
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };


  const handleMediaFilePriorityUp = (fileIndex) => {
    const updated = [...form.media];
    const files = [...(updated[mediaIndex].files || [])];
    if (fileIndex === 0) return;
    [files[fileIndex - 1], files[fileIndex]] = [files[fileIndex], files[fileIndex - 1]];
    updated[mediaIndex].files = files;
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
    setMediaIndex((form.media?.length || 0));
  };

  // const handleSubmit = () => {
  //   const updatedSection = {};

  //   if (section === "basic") {
  //     updatedSection.name = form.name?.trim();
  //     updatedSection.bio = form.bio || [];
  //     updatedSection.linkedin = form.linkedin?.trim();
  //     updatedSection.github = form.github?.trim();
  //     updatedSection.banner = form.banner;
  //   }

  //   if (section === "skills") {
  //     updatedSection.skills = form.skills?.filter(s => s.trim());
  //   }

  //   if (section === "media") {
  //     updatedSection.media = form.media;
  //   }

  //   updatedSection._id = user._id;
  //   updatedSection.email = user.email;
  //   updatedSection.image = user.image;

  //   onSave(updatedSection);
  // };

  const handleSubmit = () => {
    const updatedSection = {};

    if (section === "basic") {
      updatedSection.name = form.name?.trim();
      updatedSection.bio = Array.isArray(form.bio)
        ? form.bio.map(b => b.trim()).filter(Boolean)
        : [form.bio?.trim()];

      updatedSection.linkedin = Array.isArray(form.linkedin)
        ? form.linkedin.map(link => link.trim()).filter(Boolean)
        : [form.linkedin?.trim()].filter(Boolean);

      updatedSection.github = Array.isArray(form.github)
        ? form.github.map(link => link.trim()).filter(Boolean)
        : [form.github?.trim()].filter(Boolean);

      updatedSection.banner = form.banner;
    }

    if (section === "skills") {
      updatedSection.skills = Array.isArray(form.skills)
        ? form.skills.map(s => s.trim()).filter(Boolean)
        : [];
    }

    if (section === "media") {
      updatedSection.media = Array.isArray(form.media)
        ? form.media
        : [];
    }

    // Always include these
    updatedSection._id = user._id;
    updatedSection.email = user.email;
    updatedSection.image = user.image;

    onSave(updatedSection);
  };



  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3>Edit {section.charAt(0).toUpperCase() + section.slice(1)}</h3>

        {/* BASIC Section */}
        {section === "basic" && (
          <>
            <label>Name</label>
            <input name="name" value={form.name || ""} onChange={handleChange} />
            <label>Bio</label>
            <textarea
              name="bio"
              rows={3}
              value={form.bio?.join("\n") || ""}
              onChange={(e) => setForm({ ...form, bio: e.target.value.split("\n") })}
            />
            <label>LinkedIn Link</label>
            <input name="linkedin" value={form.linkedin || ""} onChange={handleChange} />
            <label>GitHub Link</label>
            <input name="github" value={form.github || ""} onChange={handleChange} />
            <label>Banner Upload</label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
            {previewBannerUrl && (
              <img
                src={previewBannerUrl}
                alt="Banner Preview"
                style={{ width: "200px", height: "200px", marginTop: "10px" }}
              />
            )}

          </>
        )}

        {/* SKILLS Section */}
        {section === "skills" && (
          <>
            <label>Add Skill</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} />
              <button onClick={handleSkillAdd}>Add</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem" }}>
              {(form.skills || []).map((skill, i) => (
                <div key={i} style={{ background: "#eee", padding: "0.3rem 0.6rem", borderRadius: "4px" }}>
                  {skill} <span onClick={() => handleSkillDelete(i)} style={{ cursor: "pointer", color: "red" }}>×</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* MEDIA Section */}
        {/* {section === "media" && (
          <>
            {mediaIndex === null ? (
              <>
                <h4>Project List</h4>
                <button onClick={handleAddNewMedia}>➕ Add New</button>
                {(form.media || []).map((m, i) => (
                  <div key={i} style={{ marginTop: "1rem", border: "1px solid #ddd", padding: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <strong>({m.priority}) {m.title}</strong>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button onClick={() => handleMediaPriorityUp(i)}>⬆</button>
                        <button onClick={() => handleMediaEdit(i)}>✏️ Edit</button>
                        <button onClick={() => handleMediaDelete(i)}>🗑️ Delete</button>
                      </div>
                    </div>
                    <p>{m.description}</p>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                      {(m.files || []).map((file, idx) =>
                        file.type === "video" ? (
                          <video key={idx} src={file.url} width="100" controls />
                        ) : (
                          <img key={idx} src={file.url} width="100" alt="media" />
                        )
                      )}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <label>Title</label>
                <input
                  value={form.media[mediaIndex].title}
                  onChange={(e) => handleMediaUpdate("title", e.target.value)}
                />

                <label>Description</label>
                <textarea
                  value={form.media[mediaIndex].description}
                  onChange={(e) => handleMediaUpdate("description", e.target.value)}
                />

                <label>Upload Media</label>

                <input type="file" multiple accept="image/*,video/*" onChange={(e) => handleMediaFileUpload(e.target.files)} />

 


                <h5>Media List (Priority)</h5>
                {(form.media[mediaIndex].files || []).map((file, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <span>#{i}</span>
                    {file.type === "video" ? (
                      <video src={file.url} width="80" controls />
                    ) : (
                      <img src={file.url} width="80" alt="media" />
                    )}
                    <button onClick={() => handleMediaFilePriorityUp(i)}>⬆</button>
                  </div>
                ))}

                <button onClick={() => setMediaIndex(null)}>Done Editing</button>
              </>
            )}
          </>
        )} */}


        {/* MEDIA Section */}
        {section === "media" && (
          <>
            {mediaIndex === null ? (
              <>
                <h4>Project List</h4>
                <button onClick={handleAddNewMedia}>➕ Add New</button>
                {(form.media || []).map((m, i) => (
                  <div key={i} style={{ marginTop: "1rem", border: "1px solid #ddd", padding: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <strong>({m.priority}) {m.title}</strong>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button onClick={() => handleMediaPriorityUp(i)}>⬆</button>
                        <button onClick={() => handleMediaEdit(i)}>✏️ Edit</button>
                        <button onClick={() => handleMediaDelete(i)}>🗑️ Delete</button>
                      </div>
                    </div>
                    <p>{m.description}</p>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                      {(m.files || []).map((file, fileIdx) => {
                        const url = `http://localhost:5000/uploads/media/${file.url}`;
                        return (
                          <div key={fileIdx} style={{ position: "relative" }}>
                            {file.type === "video" ? (
                              <video src={url} width="100" controls />
                            ) : (
                              <img src={url} width="100" alt="media" />
                            )}
                            {/* <button
                              onClick={() => handleMediaFileDelete(i, fileIdx)} // 🟢 Pass outer project index `i`
                              style={{ position: "absolute", top: 0, right: 0 }}
                            >
                              ❌
                            </button> */}
                          </div>
                        );
                      })}


                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <label>Title</label>
                <input
                  value={form.media[mediaIndex].title}
                  onChange={(e) => handleMediaUpdate("title", e.target.value)}
                />

                <label>Description</label>
                <textarea
                  value={form.media[mediaIndex].description}
                  onChange={(e) => handleMediaUpdate("description", e.target.value)}
                />

                <label>Upload Media</label>
                <input type="file" multiple accept="image/*,video/*" onChange={(e) => handleMediaFileUpload(e.target.files)} />

                <h5>Media List (Priority)</h5>
                {(form.media[mediaIndex].files || []).map((file, i) => {
                  const url = `http://localhost:5000/uploads/media/${file.url}`;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <span>#{i}</span>
                      {file.type === "video" ? (
                        <video src={url} width="80" controls />
                      ) : (
                        <img src={url} width="80" alt="media" />
                      )}
                      <button onClick={() => handleMediaFilePriorityUp(i)}>⬆</button>
                      <button onClick={() => handleMediaFileDelete(i)}>❌</button>
                    </div>
                  );
                })}

                <button onClick={() => setMediaIndex(null)}>Done Editing</button>
              </>
            )}
          </>
        )}



        <div className="modal-actions">
          <button onClick={handleSubmit}>💾 Save</button>
          <button onClick={onCancel}>❌ Cancel</button>
        </div>
      </div>
<style jsx>{`
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  .modal-box {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    width: 90%;
    max-width: 720px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  }

  h3 {
    margin-top: 0;
    font-size: 1.4rem;
    margin-bottom: 1rem;
  }

  label {
    display: block;
    margin-top: 1rem;
    margin-bottom: 0.3rem;
    font-weight: 600;
  }

  input[type="text"],
  input[type="file"],
  textarea {
    width: 100%;
    padding: 0.6rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 0.95rem;
  }

  textarea {
    resize: vertical;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 2rem;
    gap: 1rem;
  }

  .modal-actions button {
    padding: 0.6rem 1.2rem;
    font-weight: 600;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .modal-actions button:first-child {
    background-color: #007bff;
    color: white;
  }

  .modal-actions button:first-child:hover {
    background-color: #0056b3;
  }

  .modal-actions button:last-child {
    background-color: #e0e0e0;
  }

  .modal-actions button:last-child:hover {
    background-color: #c0c0c0;
  }

  .media-preview {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.5rem;
  }

  .media-preview img,
  .media-preview video {
    width: 100px;
    border-radius: 6px;
    object-fit: cover;
  }

  .skill-chip {
    background: #f0f0f0;
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .skill-chip span {
    margin-left: 0.5rem;
    cursor: pointer;
    color: red;
    font-weight: bold;
  }

  .project-box {
    border: 1px solid #ddd;
    padding: 0.8rem;
    margin-top: 1rem;
    border-radius: 8px;
    background: #fafafa;
  }

  .project-box strong {
    font-weight: 600;
  }

  .project-box-controls {
    display: flex;
    gap: 0.5rem;
  }

  .media-item {
    position: relative;
    display: inline-block;
  }

  .media-item button {
    position: absolute;
    top: -8px;
    right: -8px;
    background: red;
    color: white;
    border: none;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    font-size: 12px;
    cursor: pointer;
  }
`}</style>

    </div>
  );
};

export default EditModal;
