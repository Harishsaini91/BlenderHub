// client/src/components/events/ShareModal.js
import React, { useState } from "react";
import { searchUsers, shareEvent } from "./eventApi";

/**
 * Props:
 *  - event
 *  - onClose()
 *  - onSent()
 */
const ShareModal = ({ event, onClose, onSent }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState(
    `You're invited to join "${event?.name}"!\n\n${event?.description || ""}\n\nRules: ${
      event?.rules || "N/A"
    }`
  );

  /** 🔍 Search connected users */
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    try {
      const res = await searchUsers(searchTerm);
      setResults(res.data || []);
    } catch (err) {
      console.error("User search failed:", err);
    }
  };

  /** Toggle user selection */
  const toggleSelect = (user) => {
    const exists = selectedUsers.find((u) => u._id === user._id);

    if (exists) {
      setSelectedUsers(selectedUsers.filter((u) => u._id !== user._id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  /** 📤 Send invites */
  const handleSend = async () => {
    if (selectedUsers.length === 0) {
      alert("Please select at least one user.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        eventId: event._id,
        receivers: selectedUsers.map((u) => ({
          id: u._id,
          email: u.email,
          name: u.name,
        })),
        message,
      };

      const res = await shareEvent(payload);

      if (res.data?.success) {
        onSent?.();
      } else {
        alert("Failed to send: " + (res.data?.message || ""));
      }
    } catch (err) {
      console.error("Share request error:", err);
      alert("Failed to send invites.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="event-modal-overlay">
      <div className="event-modal-card share-modal">
        <h3>📤 Share Event: {event.name}</h3>

        {/* SEARCH BAR */}
        <div className="search-section">
          <input
            placeholder="Search users by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button onClick={handleSearch}>Search</button>
        </div>

        {/* SEARCH RESULTS */}
        <div className="results-list">
          {results.length > 0 ? (
            results.map((u) => (
              <div
                key={u._id}
                className={`result-item ${
                  selectedUsers.some((sel) => sel._id === u._id) ? "selected" : ""
                }`}
                onClick={() => toggleSelect(u)}
              >
                <img
                  src={`http://localhost:5000/uploads/image/${u.image}`}
                  onError={(e) => (e.target.src = "/default-avatar.png")}
                  alt="profile"
                  className="user-avatar"
                />
                <span>{u.name}</span>
              </div>
            ))
          ) : (
            <p className="muted">No users found.</p>
          )}
        </div>

        {/* CUSTOM MESSAGE */}
        <textarea
          className="invite-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write a custom message..."
        />

        {/* EVENT INFO (auto included) */}
        <div className="invite-footer">
          <p>
            Event Link:{" "}
            <a
              href={`http://localhost:3000/events/${event.eventLink || event._id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Event
            </a>
          </p>

          {event.visibility === "private" && (
            <p>
              <strong>Passkey:</strong>{" "}
              <code>{event.passkey || "Shared by event creator"}</code>
            </p>
          )}
        </div>

        {/* ACTION BUTTONS */}
        <div className="modal-actions">
          <button onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button onClick={handleSend} disabled={loading}>
            {loading ? "Sending..." : "Send Invites"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
