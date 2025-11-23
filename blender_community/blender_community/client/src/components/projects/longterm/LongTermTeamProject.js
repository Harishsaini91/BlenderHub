// client/src/components/projects/longterm/LongTermTeamProject.js
import React, { useState } from "react";
import { submitTeamProject } from "../projectApi";
// import "./longterm_project_modal.css";

const LongTermTeamProject = ({ user, onClose }) => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    githubRepo: "", // frontend uses githubRepo but backend needs githubUrl
    visibility: "public",
  });

  const [members, setMembers] = useState([
    { name: user?.name || "", email: user?.email || "", role: "Lead" },
  ]);

  const [mediaFiles, setMediaFiles] = useState([]);
  const [creating, setCreating] = useState(false);

  const token =
    user?.token ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

  const update = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const addMember = () =>
    setMembers((m) => [...m, { name: "", email: "", role: "" }]);

  const updateMember = (i, k, v) =>
    setMembers((m) =>
      m.map((mm, idx) => (idx === i ? { ...mm, [k]: v } : mm))
    );

  const removeMember = (i) =>
    setMembers((m) => m.filter((_, idx) => idx !== i));

  const onSelectFiles = (e) =>
    setMediaFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);

  // ---------------------------
  // SUBMIT LOGIC (FULL FIXED)
  // ---------------------------
  const submit = async () => {
    if (!token) return alert("Please login to create a team project.");
    if (!form.title.trim()) return alert("Title required");
    if (!members || members.length === 0)
      return alert("Add at least one team member.");

    setCreating(true);

    try {
      // 🔥 BACKEND requires these fields:
      // teamName, bio, tags, members, githubUrl, visibility
      const payload = {
        teamName: form.title,
        bio: form.description,
        tags: form.category
          ? form.category.split(",").map((s) => s.trim())
          : [],
        members: members,
        githubUrl: form.githubRepo, // 🔥 correct field name
        visibility: form.visibility,
      };

      const res = await submitTeamProject(payload, mediaFiles, token);

      if (res?.data?.success) {
        alert(
          "Team project created. Invitations/notifications will be sent to members."
        );
        onClose?.(); // 🔥 close modal
      } else {
        alert(res?.data?.message || "Failed to create project.");
      }
    } catch (err) {
      console.error("Create team project failed:", err);
      alert("Error creating project.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="longterm-overlay">
      <div className="longterm-modal">
        <h2>Create Team Project</h2>

        <label>Project Title</label>
        <input
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
        />

        <label>Category (comma separated)</label>
        <input
          value={form.category}
          placeholder="Blender, Animation, AI..."
          onChange={(e) => update("category", e.target.value)}
        />

        <label>Description</label>
        <textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={4}
        />

        <label>GitHub Repository</label>
        <input
          value={form.githubRepo}
          placeholder="https://github.com/team/repo"
          onChange={(e) => update("githubRepo", e.target.value)}
        />

        <label>Visibility</label>
        <select
          value={form.visibility}
          onChange={(e) => update("visibility", e.target.value)}
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>

        <h3>Team Members</h3>
        {members.map((m, i) => (
          <div key={i} className="team-member-row">
            <input
              value={m.name}
              placeholder="Name"
              onChange={(e) => updateMember(i, "name", e.target.value)}
            />
            <input
              value={m.email}
              placeholder="Email"
              onChange={(e) => updateMember(i, "email", e.target.value)}
            />
            <input
              value={m.role}
              placeholder="Role"
              onChange={(e) => updateMember(i, "role", e.target.value)}
            />
            <button className="remove-member" onClick={() => removeMember(i)}>
              Remove
            </button>
          </div>
        ))}

        <button className="add-member-btn" onClick={addMember}>
          + Add Member
        </button>

        <label>Media (images, videos, .blend files)</label>
        <input
          type="file"
          accept="image/*,video/*,.blend"
          multiple
          onChange={onSelectFiles}
        />

        <div className="media-preview-row">
          {mediaFiles.map((f, i) => {
            const url = URL.createObjectURL(f);
            const isVideo = f.type?.startsWith("video");
            return (
              <div key={i} className="media-preview">
                {isVideo ? (
                  <video src={url} controls />
                ) : (
                  <img src={url} alt={f.name} />
                )}
                <div className="media-meta">
                  <small>{f.name}</small>
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-actions">
          <button className="submit-btn" onClick={submit} disabled={creating}>
            {creating ? "Creating..." : "Create Team Project"}
          </button>
          <button className="close-btn" onClick={() => onClose?.()}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default LongTermTeamProject;
