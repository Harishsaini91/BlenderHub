import React, { useState } from "react";
import { updateTeamProject, uploadProjectMedia } from "../projectApi";
import "./longterm_project_modal.css";

/**
 * Props:
 *  - user
 *  - project  (the team doc from server)
 *  - onClose()
 */
const EditLongTermProject = ({ user, project, onClose }) => {
  const [form, setForm] = useState({
    teamName: project.teamName || "",
    bio: project.bio || "",
    tags: (project.tags || []).join(", "),
    githubRepo: project.repo?.url || "",
    visibility: project.isPublic ? "public" : "private",
  });

  const [members, setMembers] = useState(
    (project.members || []).map((m) => ({
      userId: m.userId || null,
      name: m.name || "",
      email: m.email || "",
      role: m.role || "Member",
    }))
  );

  const [newMediaFiles, setNewMediaFiles] = useState([]); // files added now
  const [submitting, setSubmitting] = useState(false);

  const token =
    user?.token ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

  const updateField = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const addMember = () =>
    setMembers((m) => [...m, { userId: null, name: "", email: "", role: "Member" }]);

  const updateMember = (i, k, v) => {
    setMembers((m) => m.map((mm, idx) => (idx === i ? { ...mm, [k]: v } : mm)));
  };

  const removeMember = (i) => setMembers((m) => m.filter((_, idx) => idx !== i));

  const onSelectFiles = (e) => {
    const files = Array.from(e.target.files || []);
    setNewMediaFiles((prev) => [...prev, ...files]);
    e.target.value = null;
  };

  const submit = async () => {
    if (!form.teamName.trim()) return alert("Team name required");
    setSubmitting(true);
    try {
      // prepare payload
      const payload = {
        teamName: form.teamName,
        bio: form.bio,
        tags: form.tags,
        members,
        githubRepo: form.githubRepo,
        visibility: form.visibility,
      };

      // call update API (server accepts media files in same PUT)
      const res = await updateTeamProject(project._id, payload, newMediaFiles, token);

      if (res?.data?.success) {
        alert("Project updated.");
        onClose?.();
      } else {
        console.warn("Update response:", res?.data);
        alert(res?.data?.message || "Failed to update project.");
      }
    } catch (err) {
      console.error("Update error:", err);
      alert("Error updating project.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="longterm-overlay">
      <div className="longterm-modal wide">
        <h2>Edit Project — {project.teamName}</h2>

        <label>Team Name</label>
        <input value={form.teamName} onChange={(e) => updateField("teamName", e.target.value)} />

        <label>Bio / Short description</label>
        <textarea value={form.bio} onChange={(e) => updateField("bio", e.target.value)} rows={3} />

        <label>Tags (comma separated)</label>
        <input value={form.tags} onChange={(e) => updateField("tags", e.target.value)} />

        <label>GitHub Repo</label>
        <input value={form.githubRepo} onChange={(e) => updateField("githubRepo", e.target.value)} placeholder="https://github.com/owner/repo" />

        <label>Visibility</label>
        <select value={form.visibility} onChange={(e) => updateField("visibility", e.target.value)}>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>

        <h3>Members</h3>
        {members.map((m, i) => (
          <div className="team-member-row" key={i}>
            <input value={m.name} placeholder="Name" onChange={(e) => updateMember(i, "name", e.target.value)} />
            <input value={m.email} placeholder="Email" onChange={(e) => updateMember(i, "email", e.target.value)} />
            <input value={m.role} placeholder="Role" onChange={(e) => updateMember(i, "role", e.target.value)} />
            <button className="remove-member" onClick={() => removeMember(i)}>Remove</button>
          </div>
        ))}
        <button className="add-member-btn" onClick={addMember}>+ Add Member</button>

        <label>Add Media (images, videos, .blend)</label>
        <input type="file" accept="image/*,video/*,.blend" multiple onChange={onSelectFiles} />
        <div className="media-preview-row">
          {newMediaFiles.map((f, i) => {
            const url = URL.createObjectURL(f);
            const isVideo = f.type?.startsWith("video");
            return (
              <div key={i} className="media-preview">
                {isVideo ? <video src={url} controls /> : <img src={url} alt={f.name} />}
                <div className="media-meta">
                  <small>{f.name}</small>
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-actions">
          <button className="submit-btn" onClick={submit} disabled={submitting}>
            {submitting ? "Updating..." : "Update Project"}
          </button>
          <button className="close-btn" onClick={() => onClose?.()} disabled={submitting}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditLongTermProject;
