import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { searchUsersByName, shareToUsers } from "./eventApi";
import "assets/styles/components/EventShareWindow.css";
const EventShareWindow = ({ event, user = {}, onClose, onSent }) => {
  // ----------------------------
  // STATE: email section
  // ----------------------------
  const [subject, setSubject] = useState(
    `Invitation: ${event?.name || "an event"}`
  );

  const [message, setMessage] = useState(
    `You're invited to join "${event?.name || ""}"!\n\n${event?.description || ""}\n\nRules: ${
      event?.rules || "N/A"
    }`
  );

  // ----------------------------
  // STATE: search + send
  // ----------------------------
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [sendingIds, setSendingIds] = useState([]); // while sending
  const [sentIds, setSentIds] = useState([]); // session-level "sent"
  const token =
    user?.token || sessionStorage.getItem("token") || localStorage.getItem("token");

  // ----------------------------
  // PREP: already shared set
  // event.sharedWith → set(userId/email)
  // ----------------------------
  const sharedSet = useMemo(() => {
    const s = new Set();
    (event?.sharedWith || []).forEach((entry) => {
      if (entry.userId) s.add(String(entry.userId));
      else if (entry.email) s.add(String(entry.email).toLowerCase());
    });
    return s;
  }, [event]);

  // ----------------------------
  // MEMBERS LIST (from user)
  // ----------------------------
  const members = Array.isArray(user?.members) ? user.members : [];

  // ----------------------------
  // Helpers
  // ----------------------------
  const isSending = (id) =>
    sendingIds.some((x) => String(x) === String(id));

  const isAlreadyPersisted = (key) =>
    key && (sharedSet.has(String(key)) || sharedSet.has(String(key).toLowerCase()));

  const isSent = (key) =>
    sentIds.includes(String(key)) || isAlreadyPersisted(key);

  const receiverFromUser = (u) => ({
    id: u?._id || null,
    email: u?.email || "",
    name: u?.name || u?.username || u?.email || "Unknown",
  });

  // ----------------------------
  // SEARCH USERS
  // ----------------------------
  const handleSearch = async () => {
    const q = searchTerm.trim();
    if (!q) return setResults([]);

    setLoadingSearch(true);
    try {
      const res = await searchUsersByName(q, token);
      setResults(res.data || []);
    } catch (err) {
      console.error("Search error:", err);
      setResults([]);
    } finally {
      setLoadingSearch(false);
    }
  };

  // ----------------------------
  // SEND SINGLE USER
  // ----------------------------
  const handleSendToUser = async (u) => {
    if (!u) return;
    const key = u._id || u.id || u.email;
    if (!key) return;

    if (isSent(key)) {
      alert("Already invited.");
      return;
    }

    setSendingIds((p) => [...p, key]);

    try {
      const payload = {
        eventId: event._id,
        receivers: [receiverFromUser(u)],
        subject,
        message,
      };

      const res = await shareToUsers(payload, token);

      if (res.data?.success) {
        setSentIds((p) => [...p, String(key)]);
        onSent && onSent({ to: u, payload });
      } else {
        alert("Failed to send invite.");
      }
    } catch (err) {
      console.error("Send error:", err);
      alert("Error sending invite.");
    } finally {
      setSendingIds((p) => p.filter((id) => String(id) !== String(key)));
    }
  };

  // ----------------------------
  // SEND MULTIPLE USERS
  // ----------------------------
  const handleSendToMultiple = async (receivers) => {
    if (!Array.isArray(receivers) || receivers.length === 0) return;

    // Deduplicate + filter already invited
    const finalList = [];
    const seen = new Set();

    receivers.forEach((r) => {
      const key = r.id || (r.email || "").toLowerCase();
      if (!key) return;
      if (seen.has(key)) return;
      if (isAlreadyPersisted(key)) return;
      seen.add(key);
      finalList.push(r);
    });

    if (finalList.length === 0) {
      alert("All selected users already invited.");
      return;
    }

    const sendingNow = finalList.map((r) => r.id || r.email);
    setSendingIds((p) => [...p, ...sendingNow]);

    try {
      const payload = {
        eventId: event._id,
        receivers: finalList,
        subject,
        message,
      };

      const res = await shareToUsers(payload, token);

      if (res.data?.success) {
        setSentIds((p) => [...p, ...sendingNow.map(String)]);
        onSent && onSent({ to: finalList, payload });
        alert(`Invites sent: ${finalList.length}`);
      } else {
        alert("Failed to send invites.");
      }
    } catch (err) {
      console.error("Multi-send error:", err);
    } finally {
      setSendingIds((p) =>
        p.filter((id) => !sendingNow.some((x) => String(id) === String(x)))
      );
    }
  };

  // ----------------------------
  // SEND ALL MEMBERS
  // ----------------------------
  const handleSendToAllMembers = () => {
    if (members.length === 0) {
      alert("You have no members.");
      return;
    }

    const receivers = members.map((m) => ({
      id: m._id,
      email: "",
      name: m.name,
    }));

    if (window.confirm(`Send invites to all ${receivers.length} members?`)) {
      handleSendToMultiple(receivers);
    }
  };

  // ----------------------------
  // UI: one member row
  // ----------------------------
  const renderUserRow = (u) => {
    const key = u._id || u.id || u.email;
    const disabled = isSending(key) || isSent(key);

    return (
      <div key={key} className="search-user-row">
        <div className="user-meta">
          <img
            src={
              u.image
                ? `/uploads/image/${u.image}`
                : "/default-avatar.png"
            }
            alt={u.name}
            className="user-thumb"
            onError={(e) => (e.target.src = "/default-avatar.png")}
          />
          <div>
            <div className="user-name">{u.name}</div>
            <div className="user-email muted">{u.email || ""}</div>
          </div>
        </div>

        <div className="user-action">
          <button
            className="send-btn"
            disabled={disabled}
            onClick={() => handleSendToUser(u)}
          >
            {isSending(key) ? "Sending..." : isSent(key) ? "Sent" : "Send"}
          </button>
        </div>
      </div>
    );
  };

  // ----------------------------
  // RENDER
  // ----------------------------
  return (
    <div className="share-modal-overlay">
      <div className="share-modal-card">
        {/* HEADER */}
        <div className="share-header">
          <h3>📤 Share Event — {event?.name}</h3>
          <button className="close-btn" onClick={() => onClose?.()}>
            ✖
          </button>
        </div>

        {/* EMAIL SECTION */}
        <div className="share-email-section">
          <label className="label">Subject</label>
          <input
            className="subject-input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <label className="label">Message</label>
          <textarea
            className="message-textarea"
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <div className="event-info-row">
            <div>
              <strong>Event Link: </strong>
              <a
                href={`${process.env.REACT_APP_FRONTEND_URL || "http://localhost:3000"}/events/${
                  event?.eventLink || event?._id
                }`}
                target="_blank"
                rel="noreferrer"
              >
                Open Event
              </a>
            </div>

            {event?.visibility === "private" && (
              <div>
                <strong>Passkey: </strong>
                <code>{event.passkey}</code>
              </div>
            )}
          </div>
        </div>

        {/* MEMBERS SECTION */}
        <div className="members-section">
          <div className="section-header">
            <strong>Your Members</strong>
            {members.length > 0 && (
              <button className="btn secondary" onClick={handleSendToAllMembers}>
                Send to All
              </button>
            )}
          </div>

          <div className="members-list">
            {members.length > 0 ? (
              members.map((m) =>
                renderUserRow({
                  _id: m._id,
                  name: m.name,
                  email: "",
                  image: m.image,
                })
              )
            ) : (
              <div className="muted">No members found.</div>
            )}
          </div>
        </div>

        {/* SEARCH SECTION */}
        <div className="share-search-section">
          <label className="label">Search users by name</label>
          <div className="search-row">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter username and press Search"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button onClick={handleSearch} disabled={loadingSearch}>
              {loadingSearch ? "Searching..." : "Search"}
            </button>
          </div>

          <div className="search-results">
            {results.length > 0 ? (
              results.map((u) => renderUserRow(u))
            ) : (
              <div className="muted">No users found.</div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="share-footer">
          <button className="btn secondary" onClick={() => onClose?.()}>
            Close
          </button>

          <button className="btn primary" onClick={handleSearch}>
            Search
          </button>
        </div>
      </div>
    </div>
  );
};

EventShareWindow.propTypes = {
  event: PropTypes.object.isRequired,
  user: PropTypes.object,
  onClose: PropTypes.func,
  onSent: PropTypes.func,
};

export default EventShareWindow;
