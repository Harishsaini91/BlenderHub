import React, { useState } from "react";
import axios from "axios";
import "./participantList.css";
import { markWinner } from "../eventApi";

const ParticipantList = ({
  participants = [],
  eventName = "",
  isOwner = false,
  eventId,
}) => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    "";

 async function handleSetWinner(participantId, position) {
  try {
    const res = await markWinner(eventId, participantId, position, token);

    if (res.data.success) {
      alert("Winner updated!");
      window.location.reload();
    }
  } catch (err) {
    console.error("Winner update error:", err);
    alert("Unable to update winner.");
  }
}


  // -----------------------------------------------
  // FILTERS
  // -----------------------------------------------
  const soloList = participants.filter((p) => !p.teamName);
  const teamList = participants.filter((p) => p.teamName);

  const winners = participants
    .filter((p) => p.position)
    .sort((a, b) => a.position - b.position)
    .slice(0, 3);

  const filteredSolo = soloList.filter((p) =>
    (p.teamName || "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredTeams = teamList.filter((p) =>
    (p.teamName || "").toLowerCase().includes(search.toLowerCase())
  );

  // -----------------------------------------------
  // DETAIL MODAL
  // -----------------------------------------------
  const DetailModal = () => {
    if (!selected) return null;

    return (
      <div className="pl-modal-overlay" onClick={() => setSelected(null)}>
        <div className="pl-modal" onClick={(e) => e.stopPropagation()}>
          <button className="pl-close" onClick={() => setSelected(null)}>
            ✖
          </button>

          <h2>{eventName}</h2>

          <div className="pl-modal-header">
            <img src={selected.image} alt="" className="pl-modal-img" />
            <div>
              <h3>{selected.name}</h3>
              <p className="team-name">{selected.teamName || "Solo Participant"}</p>

              {selected.github && (
                <a href={selected.github} target="_blank" rel="noreferrer">
                  GitHub Repo ↗
                </a>
              )}
            </div>
          </div>

          {selected.teamMembers?.length > 0 && (
            <>
              <h4>Team Members</h4>
              <div className="pl-team-list">
                {selected.teamMembers.map((m, idx) => (
                  <div key={idx} className="pl-team-member">
                    <p><b>{m.name}</b></p>
                    <p>{m.email}</p>
                    <p className="role">{m.role}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {selected.media?.length > 0 && (
            <>
              <h4>Project Media</h4>
              <div className="pl-media-grid">
                {selected.media.map((m, i) =>
                  m.type === "video" ? (
                    <video key={i} src={m.url} controls className="pl-media-item" />
                  ) : (
                    <img key={i} src={m.url} alt="" className="pl-media-item" />
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // -----------------------------------------------
  // PARTICIPANT CARD
  // -----------------------------------------------
  const ParticipantCard = ({ p }) => (
    <div className="pl-card" onClick={() => setSelected(p)}>
      <img src={p.image} alt="" className="pl-card-img" />

      <div className="pl-card-body">
        <h4>{p.name}</h4>
        <p>{p.teamName || "Solo Participant"}</p>

        {p.github && (
          <a
            className="gh-link"
            href={p.github}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            GitHub ↗
          </a>
        )}

        {/* ONLY OWNER CAN SET WINNER */}
        {isOwner && (
          <div className="pos-selector" onClick={(e) => e.stopPropagation()}>
            <label>Position:</label>
            <select
              value={p.position || ""}
              onChange={(e) => handleSetWinner(p._id, e.target.value)}
            >
              <option value="">None</option>
              <option value="1">🥇 1st</option>
              <option value="2">🥈 2nd</option>
              <option value="3">🥉 3rd</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );

  // -----------------------------------------------
  // MAIN COMPONENT RENDER
  // -----------------------------------------------
  return (
    <div className="participant-list-wrapper">

      {/* WINNERS SECTION */}
      {winners.length > 0 && (
        <div className="winner-section">
          <h2>🏆 Winners</h2>

          <div className="winner-grid">
            {winners.map((w) => (
              <div className={`winner-card place-${w.position}`} key={w._id}>
                <div className="medal">
                  {w.position === 1 ? "🥇" : w.position === 2 ? "🥈" : "🥉"}
                </div>

                <img src={w.image} alt="" className="winner-img" />
                <h3>{w.name}</h3>
                <p>{w.teamName || "Solo Participant"}</p>

                {w.github && (
                  <a href={w.github} target="_blank" rel="noreferrer">
                    GitHub ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH */}
      <div className="pl-search-box">
        <input
          placeholder="Search team name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* SOLO LIST */}
      <h3>🧍 Solo Participants</h3>
      <div className="pl-grid">
        {filteredSolo.length === 0 && <p>No solo participants found.</p>}
        {filteredSolo.map((p) => (
          <ParticipantCard p={p} key={p._id} />
        ))}
      </div>

      {/* TEAM LIST */}
      <h3 style={{ marginTop: 30 }}>👥 Team Participants</h3>
      <div className="pl-grid">
        {filteredTeams.length === 0 && <p>No team participants found.</p>}
        {filteredTeams.map((p) => (
          <ParticipantCard p={p} key={p._id} />
        ))}
      </div>

      {/* MODAL */}
      {DetailModal()}
    </div>
  );
};

export default ParticipantList;
