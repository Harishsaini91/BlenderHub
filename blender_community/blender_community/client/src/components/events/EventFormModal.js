// client/src/components/events/EventFormModal.js
import React, { useState, useEffect } from "react";
import { createEvent, updateEvent } from "./eventApi";

const EventFormModal = ({ onClose, onSaved, user, existing }) => {
  const isEditMode = Boolean(existing);

  const [form, setForm] = useState({
    name: "",
    description: "",
    rules: "",
    prize: "",
    level: "Beginner",
    contact: "",
    email: user?.email || "",
    exampleUrl: "",
    startTime: "",
    endTime: "",
    visibility: "public",
    passkey: "",
  });

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  // =====================================================================
  // PREFILL FIELDS FOR EDIT MODE
  // =====================================================================
  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name || "",
        description: existing.description || "",
        rules: existing.rules || "",
        prize: existing.prize || "",
        level: existing.level || "Beginner",
        contact: existing.contact || "",
        email: existing.email || user?.email || "",
        exampleUrl: existing.exampleUrl || "",
        startTime: existing.startTime
          ? new Date(existing.startTime).toISOString().slice(0, 16)
          : "",
        endTime: existing.endTime
          ? new Date(existing.endTime).toISOString().slice(0, 16)
          : "",
        visibility: existing.visibility || "public",
        passkey: existing.passkey || "",
      });
    }
  }, [existing, user]);

  // =====================================================================
  // MEDIA FILE HANDLER
  // =====================================================================
  const onFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  // =====================================================================
  // SUBMIT HANDLER
  // =====================================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const fd = new FormData();

      // **Append normal fields**
      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          fd.append(key, value);
        }
      });

      // **Append media**
      files.forEach((f) => fd.append("media", f));

      const token =
        user?.token ||
        sessionStorage.getItem("token") ||
        localStorage.getItem("token");

      let res;

      // ============================================================
      // CREATE MODE
      // ============================================================
      if (!isEditMode) {
        // Backend already gets userId & username from authenticate
        // DO NOT send them manually anymore
        res = await createEvent(fd, token);
      }

      // ============================================================
      // EDIT MODE
      // ============================================================
      else {
        res = await updateEvent(existing._id, fd, token);
      }

      if (res.data?.success) {
        onSaved?.(res.data.event);
      } else {
        alert(res.data?.message || "Failed to save event.");
      }
    } catch (err) {
      console.error("Save event error:", err);
      alert("Error saving event: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
      onClose?.();
    }
  };

  // =====================================================================
  // JSX
  // =====================================================================
  return (
    <div className="event-modal-overlay">
      <div className="event-modal-card">
        <h3>{isEditMode ? "Edit Event" : "Create New Event"}</h3>

        <form onSubmit={handleSubmit} className="event-form">
          {/* Event Name */}
          <input
            required
            value={form.name}
            placeholder="Event Name"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          {/* Description */}
          <textarea
            value={form.description}
            placeholder="Description"
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          {/* Rules */}
          <textarea
            value={form.rules}
            placeholder="Rules"
            onChange={(e) => setForm({ ...form, rules: e.target.value })}
          />

          {/* Prize */}
          <input
            value={form.prize}
            placeholder="Prize Details"
            onChange={(e) => setForm({ ...form, prize: e.target.value })}
          />

          {/* Level */}
          <select
            value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value })}
          >
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
            <option>Other</option>
          </select>

          {/* Contact */}
          <input
            value={form.contact}
            placeholder="Contact Info"
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
          />

          {/* Email */}
          <input
            value={form.email}
            placeholder="Email"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          {/* Example URL */}
          <input
            value={form.exampleUrl}
            placeholder="Example URL (optional)"
            onChange={(e) => setForm({ ...form, exampleUrl: e.target.value })}
          />

          {/* Start Time */}
          <label>Start Time</label>
          <input
            type="datetime-local"
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
          />

          {/* End Time */}
          <label>End Time</label>
          <input
            type="datetime-local"
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
          />

          {/* Visibility */}
          <label>Visibility</label>
          <select
            value={form.visibility}
            onChange={(e) =>
              setForm({ ...form, visibility: e.target.value })
            }
          >
            <option value="public">Public</option>
            <option value="private">Private (requires passkey)</option>
          </select>

          {/* Passkey (only for private events) */}
          {form.visibility === "private" && (
            <input
              value={form.passkey}
              placeholder="Passkey (leave blank to auto-generate)"
              onChange={(e) => setForm({ ...form, passkey: e.target.value })}
            />
          )}

          {/* Media */}
          <label>Media Files</label>
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={onFileChange}
          />

          {/* ACTION BUTTONS */}
          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>

            <button type="submit" disabled={loading}>
              {loading
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                ? "Update Event"
                : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventFormModal;
