import React, { useEffect, useState } from "react";
import {
  fetchEventById,
  interactEvent,
  verifyEventPasskey,
} from "./eventApi";
import "assets/styles/components/EventDetail.css";
/**
 * Props:
 *  - eventId: _id OR eventLink
 *  - user   : logged user (may be null)
 *  - onClose(): close modal
 */
const EventDetail = ({ eventId, onClose, user }) => {
  const [event, setEvent] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const token =
    user?.token || sessionStorage.getItem("token") || localStorage.getItem("token");
  const userId = user?._id || null;

  // Helper: safe count for likes/votes/reminders (handles number or array)
  const countOf = (val) => {
    if (Array.isArray(val)) return val.length;
    if (typeof val === "number") return val;
    return val ? 1 : 0;
  };

  // ============================================================
  // LOAD EVENT (and handle private passkey if needed)
  // ============================================================
async function loadEvent() {
  if (!eventId) return;

  try {
    // preview=true (NO PASSKEY NEEDED)
    const res = await fetchEventById(eventId, null, true);

    if (res?.data?.success) {
      setEvent(res.data.event);
    }
  } catch (err) {
    console.error("Error loading event:", err);
    onClose?.();
  }
}


useEffect(() => {
  if (!eventId) return;  // 🔥 prevent calling /undefined
  loadEvent();
}, [eventId]);


  // ============================================================
  // PERFORM ACTION (like / vote / remind / comment)
  // toggles are handled by server — we just update UI from response
  // ============================================================
  async function doAction(action, payload = {}) {
    if (!token) {
      return alert("Please login first.");
    }

    setLoading(true);
    try {
      const res = await interactEvent(eventId, { action, ...payload }, token);
      if (res?.data?.success) {
        setEvent(res.data.event);
      } else {
        alert(res?.data?.message || "Action failed.");
      }
    } catch (err) {
      console.error("Interaction failed:", err);
      alert("Failed to perform action.");
    } finally {
      setLoading(false);
    }
  }

  if (!event) return null;

  // determine whether current user liked/voted/reminded
  const liked =
    userId &&
    (Array.isArray(event.likes)
      ? event.likes.some((u) => String(u) === String(userId))
      : false);

  const voted =
    userId &&
    (Array.isArray(event.votes)
      ? event.votes.some((u) => String(u) === String(userId))
      : false);

  const reminded =
    userId &&
    (Array.isArray(event.reminders)
      ? event.reminders.some((u) => String(u) === String(userId))
      : false);

  const likesCount = countOf(event.likes);
  const votesCount = countOf(event.votes);
  const remindersCount = countOf(event.reminders);

  return (
    <div className="event-detail-overlay" role="dialog" aria-modal="true">
      <div className="event-detail-card">
        {/* Close */}
        <button className="close-btn" onClick={onClose} aria-label="Close">
          ✖
        </button>

        {/* Title */}
        <h2 className="detail-title">{event.name}</h2>

        {/* Host */}
        <div className="host-info">
          <img
            src={
              event.userId?.image
                ? `/uploads/image/${event.userId.image}`
                : "/default-avatar.png"
            }
            alt="host"
            className="host-image"
            onError={(e) => (e.target.src = "/default-avatar.png")}
          />
          <div>
            <div className="host-name">Hosted by {event.username}</div>
            <div className="muted small">
              {event.startTime ? new Date(event.startTime).toLocaleString() : ""}
            </div>
          </div>
        </div>

        {/* Media */}
        <div className="detail-media-strip">
          {event.media?.length === 0 ? (
            <p className="muted">No media attached</p>
          ) : (
            event.media.map((m, i) =>
              m.type === "video" ? (
                <video key={i} src={m.url} controls className="detail-video" />
              ) : (
                <img key={i} src={m.url} className="detail-image" alt="" />
              )
            )
          )}
        </div>

        {/* Description + details */}
        <p className="desc-block">{event.description}</p>

        <div className="info-block">
          {event.rules && (
            <p>
              <strong>Rules:</strong> {event.rules}
            </p>
          )}
          {event.prize && (
            <p>
              <strong>Prize:</strong> {event.prize}
            </p>
          )}
          <p>
            <strong>Visibility:</strong>{" "}
            {event.visibility === "private" ? "🔒 Private" : "🌍 Public"}
          </p>
        </div>

        {/* Action buttons */}
        <div className="event-actions">
          <button
            className={`action-btn like-btn ${liked ? "active-like" : ""}`}
            onClick={() => doAction("like")}
            disabled={loading}
            title={liked ? "Unlike" : "Like"}
          >
            <span className="btn-emoji">❤️</span>
            <span className="btn-text">{likesCount}</span>
          </button>

          <button
            className={`action-btn vote-btn ${voted ? "active-vote" : ""}`}
            onClick={() => doAction("vote")}
            disabled={loading}
            title={voted ? "Remove vote" : "Vote"}
          >
            <span className="btn-emoji">⬆️</span>
            <span className="btn-text">{votesCount}</span>
          </button>

          <button
            className={`action-btn remind-btn ${reminded ? "active-remind" : ""}`}
            onClick={() => doAction("remind")}
            disabled={loading}
            title={reminded ? "Remove reminder" : "Remind me"}
          >
            <span className="btn-emoji">🔔</span>
            <span className="btn-text">{remindersCount}</span>
          </button>

          
        </div>

        {/* Comments */}
        <div className="comments-section">
          <h4>Comments</h4>

          <div className="comment-form">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={token ? "Write a comment..." : "Login to comment"}
              disabled={!token || loading}
            />
            <button
              onClick={() => {
                if (!token) return alert("Please login to comment");
                if (!commentText.trim()) return;
                doAction("comment", { text: commentText.trim() });
                setCommentText("");
              }}
              disabled={!token || loading}
            >
              Send
            </button>
          </div>

          <div className="comment-list">
            {(!event.comments || event.comments.length === 0) ? (
              <p className="muted">No comments yet.</p>
            ) : (
              event.comments.map((c, idx) => (
                <div className="comment" key={idx}>
                  <div className="comment-head">
                    <strong>{c.username || c.name || "Anon"}</strong>
                    <span className="muted small">
                      {" • "}{new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="comment-body">{c.text}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
