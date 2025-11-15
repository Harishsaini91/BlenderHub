// client/src/components/events/EventCard.js
import React, { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { verifyEventPasskey, interactEvent } from "./eventApi";
import "assets/styles/components/EventCard.css";
const EventCard = ({
    event,
    currentUser,
    onOpen,
    onEdit,
    onDelete,
    onShare,
}) => {
    const userId = currentUser?._id || null;
    const token =
        currentUser?.token ||
        sessionStorage.getItem("token") ||
        localStorage.getItem("token");

    const [localEvent, setLocalEvent] = useState(event);
    const ev = localEvent;

    const preview = ev.media?.[0] || null;
    const isCreator = userId && String(userId) === String(ev.userId);

    /** Safe count helper */
    const countOf = (v) => {
        if (Array.isArray(v)) return v.length;
        if (typeof v === "number") return v;
        return 0;
    };

    /** LIKE / VOTE / REMIND toggle */
    async function handleAction(action) {
        if (!token) return alert("Please login first.");

        try {
            const res = await interactEvent(ev._id || ev.eventLink, { action }, token);
            if (res.data?.success) {
                setLocalEvent(res.data.event); // update UI
            } else {
                alert(res.data?.message || "Failed.");
            }
        } catch (err) {
            console.error("Action error:", err);
            alert("Action failed.");
        }
    }

    /** PRIVATE CHECK */
  const handleOpen = () => {
  onOpen?.(ev);
};

    // ======================================================
    // 🔥 SMART TIME STATUS (updates every 10 min, or 1 min in last 10)
    // ======================================================
    const [statusLabel, setStatusLabel] = useState("");

    useEffect(() => {
        if (!ev.startTime) return;

        function updateStatus() {
            const now = new Date();
            const start = new Date(ev.startTime);
            const end = ev.endTime ? new Date(ev.endTime) : null;

            // ============= UPCOMING =============
            if (now < start) {
                const diffMs = start - now;

                let diffMin = Math.floor(diffMs / 60000);

                const days = Math.floor(diffMin / (60 * 24));
                diffMin -= days * 60 * 24;

                const hours = Math.floor(diffMin / 60);
                const mins = diffMin % 60;

                // Build readable string
                let timeStr = "";
                if (days > 0) timeStr += `${days}d `;
                if (hours > 0) timeStr += `${hours}h `;
                if (mins > 0) timeStr += `${mins}m`;

                if (!timeStr.trim()) timeStr = "0m";

                setStatusLabel(`⏳ Upcoming • ${timeStr.trim()}`);

                // Update speed (every 10 min, last 10 min → every 1 min)
                return (days === 0 && hours === 0 && mins <= 10) ? 1 : 10;
            }

            // ============= LIVE =============
            if (start && end && now >= start && now <= end) {
                setStatusLabel("🟢 Live Now");
                return 10;
            }

            // ============= ENDED =============
            if (end && now > end) {
                setStatusLabel("🔴 Event Ended");
                return null;
            }
        }


        // Run immediately
        let intervalMinutes = updateStatus();
        if (!intervalMinutes) return;
        let intervalMs = intervalMinutes * 60 * 1000;

        const timer = setInterval(updateStatus, intervalMs);
        return () => clearInterval(timer);
    }, [ev.startTime, ev.endTime]);

    // Determine likes/votes/reminders
    const liked = userId && Array.isArray(ev.likes) && ev.likes.some((u) => String(u) === String(userId));
    const voted = userId && Array.isArray(ev.votes) && ev.votes.some((u) => String(u) === String(userId));
    const reminded = userId && Array.isArray(ev.reminders) && ev.reminders.some((u) => String(u) === String(userId));

    return (
        <div className="event-card">
            {/* MEDIA PREVIEW */}
            <div className="card-media" onClick={handleOpen}>
                {preview ? (
                    preview.type === "video" ? (
                        <video src={preview.url} muted playsInline className="card-video" />
                    ) : (
                        <img src={preview.url} alt={ev.name} className="card-image" />
                    )
                ) : (
                    <div className="card-placeholder">No Media</div>
                )}

                {ev.visibility === "private" && (
                    <div className="private-badge">🔒 Private</div>
                )}
            </div>

            {/* TEXT BODY */}
            <div className="card-body" onClick={handleOpen}>
                <h4 className="event-title">{ev.name}</h4>

                {statusLabel && (
                    <p className="event-status-tag">{statusLabel}</p>
                )}

                <p className="muted small">
                    {ev.username} •{" "}
                    {ev.createdAt
                        ? formatDistanceToNow(new Date(ev.createdAt)) + " ago"
                        : ""}
                </p>

                <p className="small description">
                    {ev.description
                        ? ev.description.slice(0, 90) +
                        (ev.description.length > 90 ? "..." : "")
                        : ""}
                </p>
            </div>

            {/* ACTION BUTTONS */}
            <div className="card-actions">
                <button
                    className={`mini-action like ${liked ? "active-like" : ""}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleAction("like");
                    }}
                >
                    ❤️ {countOf(ev.likes)}
                </button>

                <button
                    className={`mini-action vote ${voted ? "active-vote" : ""}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleAction("vote");
                    }}
                >
                    ⬆️ {countOf(ev.votes)}
                </button>

                <button
                    className={`mini-action remind ${reminded ? "active-remind" : ""}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleAction("remind");
                    }}
                >
                    🔔 {countOf(ev.reminders)}
                </button>
            </div>

            {/* FOOTER BUTTONS */}
            <div className="card-btn-row">

                {/* VIEW MODAL */}
                <button
                    className="btn-view"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleOpen();
                    }}
                >
                    View
                </button>

                {/* VISIT FULL SCREEN PAGE */}
                <button
                    className="btn-visit"
                    onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/event/${ev._id || ev.eventLink}`, "_blank");
                    }}
                >
                    Visit Page
                </button>


                {/* SHARE */}
                {onShare && (
                    <button
                        className="btn-share"
                        onClick={(e) => {
                            e.stopPropagation();
                            onShare(ev);
                        }}
                    >
                        Share
                    </button>
                )}

                {/* EDIT */}
                {isCreator && onEdit && (
                    <button
                        className="btn-edit"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(ev);
                        }}
                    >
                        Edit
                    </button>
                )}

                {/* DELETE */}
                {isCreator && onDelete && (
                    <button
                        className="btn-delete"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(ev);
                        }}
                    >
                        Delete
                    </button>
                )}

            </div>
        </div>
    );
};

export default EventCard;
