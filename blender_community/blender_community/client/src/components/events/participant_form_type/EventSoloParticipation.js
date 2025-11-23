// client/src/components/events/participant_form_type/EventSoloParticipation.js
import React, { useState } from "react";
import { submitSoloParticipation } from "../eventApi";
import "./participation_modal.css";

const EventSoloParticipation = ({ event, user, onClose }) => {
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    githubRepo: "",
    portfolio: "",
    skills: "",
  });
  const [loading, setLoading] = useState(false);

  const token =
    user?.token ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

  const update = (k, v) => setForm({ ...form, [k]: v });

  const submit = async () => {
    if (!token) return alert("Please login first.");

    if (!form.name.trim()) return alert("Name required");

    setLoading(true);
    try {
      const res = await submitSoloParticipation(event._id, form, token);

      if (res.data?.success) {
        alert("Participation submitted! You will receive an email.");
        onClose();
      } else {
        alert(res.data?.message || "Failed to submit.");
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("Error submitting participation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="participation-modal-overlay">
      <div className="participation-modal">
        <h2>Solo Participation</h2>

        <label>Name</label>
        <input
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
        />

        <label>Email</label>
        <input
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
        />

        <label>GitHub Repository Link</label>
        <input
          value={form.githubRepo}
          placeholder="https://github.com/user/repo"
          onChange={(e) => update("githubRepo", e.target.value)}
        />

        <label>Portfolio (optional)</label>
        <input
          value={form.portfolio}
          onChange={(e) => update("portfolio", e.target.value)}
        />

        <label>Skills</label>
        <textarea
          value={form.skills}
          onChange={(e) => update("skills", e.target.value)}
        ></textarea>

        <button className="submit-btn" disabled={loading} onClick={submit}>
          {loading ? "Submitting..." : "Submit Participation"}
        </button>

        <button className="close-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default EventSoloParticipation;
