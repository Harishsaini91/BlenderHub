// client/src/components/events/participant_form_type/EventTeamParticipation.js
import React, { useState } from "react";
import { submitTeamParticipation } from "../eventApi";
import "./participation_modal.css";

const EventTeamParticipation = ({ event, user, onClose }) => {
  const [teamName, setTeamName] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [members, setMembers] = useState([
    { name: user?.name, email: user?.email, role: "Leader" },
  ]);
  const [loading, setLoading] = useState(false);

  const token =
    user?.token ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

  const addMember = () => {
    setMembers([...members, { name: "", email: "", role: "" }]);
  };

  const updateMember = (i, k, v) => {
    const copy = [...members];
    copy[i][k] = v;
    setMembers(copy);
  };

  const submit = async () => {
    if (!teamName.trim()) return alert("Team name required");

    setLoading(true);
    try {
      const res = await submitTeamParticipation(
        event._id,
        { teamName, githubRepo, members },
        token
      );

      if (res.data?.success) {
        alert("Team participation submitted! Email sent.");
        onClose();
      } else {
        alert(res.data?.message || "Failed to submit.");
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("Error submitting.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="participation-modal-overlay">
      <div className="participation-modal">
        <h2>Team Participation</h2>

        <label>Team Name</label>
        <input
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
        />

        <label>GitHub Repo (One shared)</label>
        <input
          value={githubRepo}
          onChange={(e) => setGithubRepo(e.target.value)}
          placeholder="https://github.com/team/repo"
        />

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
          </div>
        ))}

        <button className="add-member-btn" onClick={addMember}>
          + Add Member
        </button>

        <button className="submit-btn" disabled={loading} onClick={submit}>
          {loading ? "Submitting..." : "Submit Team"}
        </button>

        <button className="close-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default EventTeamParticipation;
