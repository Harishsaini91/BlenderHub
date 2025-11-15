// client/src/components/events/EventList.js
import React, { useEffect, useState } from "react";
import EventCard from "./EventCard";
import EventDetail from "./EventDetail";
import * as api from "./eventApi";
import EventShareWindow from "./EventShareWindow";

/**
 * EventList = Public Event Board
 * Shows ALL events (public + private)
 * Clicking a card opens detail; private events ask passkey.
 * Share button opens EventShareWindow.
 */
const EventList = ({ user }) => {
    const [events, setEvents] = useState([]);
    const [selected, setSelected] = useState(null);       // Open EventDetail
    const [showShare, setShowShare] = useState(null);     // Open Share modal
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // =========================================================
    // LOAD ALL EVENTS (PUBLIC LIST)
    // =========================================================
 async function load() {
  setLoading(true);
  setError(null);

  try {
    const res = await api.fetchEvents();

    if (res.data?.success) {
      const evs = res.data.events || [];

      const sorted = evs.sort((a, b) => {
        const av = typeof a.votes === "number" ? a.votes : 0;
        const bv = typeof b.votes === "number" ? b.votes : 0;

        if (bv !== av) return bv - av; // votes DESC
        return new Date(b.createdAt) - new Date(a.createdAt); // date DESC
      });

      setEvents(sorted);
    } else {
      setEvents([]);
      setError(res.data?.message || "Failed to load events.");
    }
  } catch (err) {
    console.error("Failed to fetch events:", err);
    setEvents([]);
    setError("Failed to fetch events.");
  } finally {
    setLoading(false);
  }
}


    useEffect(() => {
        load();
    }, []);

    const handleShare = (event) => {
        setShowShare(event);
    };

    return (
        <div className="event-list-page">
            {/* HEADER BAR */}
            <div className="events-header">
                <h2>🌍 Event Board</h2>

                <div className="events-header-meta">
                    <button className="btn" onClick={load} disabled={loading}>
                        {loading ? "Refreshing..." : "Refresh"}
                    </button>
                </div>
            </div>

            {error && <div className="error muted">{error}</div>}

            {/* EVENT GRID */}
            <div className="events-grid">
                {loading ? (
                    <p>Loading events...</p>
                ) : events.length === 0 ? (
                    <p className="muted">No events available.</p>
                ) : (
                    events.map((ev) => (
                        <div key={ev._id || ev.eventLink} className="event-card-wrap">
                            <EventCard
                                event={ev}
                                currentUser={user}
                                onOpen={(e) => setSelected(e)}
                                onShare={(e) => handleShare(e)}
                            />

                            {/* Under-card action buttons */}
                            <div className="card-actions-compact">
                                <button onClick={() => setSelected(ev)}>View About</button>
                                <button onClick={() => handleShare(ev)}>Share</button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* EVENT DETAIL MODAL */}
            {selected && (
                <EventDetail
                    eventId={selected._id || selected.eventLink}
                    user={user}
                    onClose={() => setSelected(null)}
                />
            )}

            {/* SHARE MODAL — NEW WINDOW */}
            {showShare && (
                <EventShareWindow
                    event={showShare}
                    user={user}
                    onClose={() => setShowShare(null)}
                    onSent={() => {
                        alert("Invite sent.");
                    }}
                />
            )}
        </div>
    );
};

export default EventList;
