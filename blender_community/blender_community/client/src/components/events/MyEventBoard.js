// client/src/components/events/MyEventBoard.js
import React, { useEffect, useState } from "react";
import {
    fetchMyEvents,
    deleteEvent,
} from "./eventApi";

import EventCard from "./EventCard";
import EventFormModal from "./EventFormModal";
import EventDetail from "./EventDetail";
import EventShareWindow from "./EventShareWindow";

const MyEventBoard = ({ user }) => {
    const [events, setEvents] = useState([]);
    const [selected, setSelected] = useState(null);  // EventDetail
    const [editing, setEditing] = useState(null);    // Edit modal
    const [showForm, setShowForm] = useState(false); // Create/Edit modal
    const [showShare, setShowShare] = useState(null); // Share modal
    const [loading, setLoading] = useState(false);

    const token =
        user?.token ||
        sessionStorage.getItem("token") ||
        localStorage.getItem("token");

    // ============================================================
    // LOAD USER'S CREATED EVENTS
    // ============================================================
    async function loadMyEvents() {
        if (!token) return alert("Please login first.");

        setLoading(true);
        try {
            const res = await fetchMyEvents(token);

            if (res.data?.success) {
                const sorted = [...(res.data.events || [])].sort(
                    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                );
                setEvents(sorted);
            }
        } catch (err) {
            console.error("Error loading my events:", err);
            alert("Failed to load events.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadMyEvents();
    }, []);

    // ============================================================
    // DELETE EVENT
    // ============================================================
    async function handleDelete(eventId) {
        if (!window.confirm("Are you sure you want to delete this event?")) return;

        try {
            const res = await deleteEvent(eventId, token);
            if (res.data?.success) {
                setEvents((prev) => prev.filter((e) => e._id !== eventId));
                alert("Event deleted successfully.");
            }
        } catch (err) {
            console.error("Delete error:", err);
            alert("Error deleting event.");
        }
    }

    // ============================================================
    // HANDLE CREATE / EDIT COMPLETION
    // ============================================================
    const handleCreatedOrUpdated = (newEvent) => {
        setEvents((prev) => {
            const exists = prev.find((e) => e._id === newEvent._id);
            if (exists) {
                return prev.map((e) => (e._id === newEvent._id ? newEvent : e));
            }
            return [newEvent, ...prev];
        });

        setShowForm(false);
        setEditing(null);
    };

    // ============================================================
    // SHARE EVENT
    // ============================================================
    const handleShare = (event) => {
        setShowShare(event);
    };

    return (
        <div className="my-events-page">
            {/* HEADER */}
            <div className="events-header">
                <h2>🎯 My Created Events</h2>

                <div>
                    <button
                        className="btn"
                        onClick={() => {
                            setEditing(null);
                            setShowForm(true);
                        }}
                    >
                        + Create New Event
                    </button>

                    <button className="btn" onClick={loadMyEvents} disabled={loading}>
                        {loading ? "Loading..." : "Refresh"}
                    </button>
                </div>
            </div>

            {/* EVENT CARDS */}
            <div className="events-grid">
                {events.length === 0 ? (
                    <p className="muted">You haven’t created any events yet.</p>
                ) : (
                    events.map((ev) => (
                        <div key={ev._id} className="my-event-card">

                            <EventCard
                                event={ev}
                                currentUser={user}
                                onOpen={() => setSelected(ev._id)}
                            />



                            {/* Host options under each card */}
                            <div className="event-actions">

                                <button onClick={() => setSelected(ev._id)}>
                                    View About
                                </button>

                                <button
                                    onClick={() => {
                                        setEditing(ev);
                                        setShowForm(true);
                                    }}
                                >
                                    Edit
                                </button>

                                <button onClick={() => handleDelete(ev._id)}>
                                    Delete
                                </button>

                                <button onClick={() => handleShare(ev)}>
                                    Share
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* VIEW ABOUT MODAL */}
            {selected && (
                <EventDetail
                    eventId={selected}
                    user={user}
                    onClose={() => setSelected(null)}
                />
            )}


            {/* CREATE / EDIT MODAL */}
            {showForm && (
                <EventFormModal
                    user={user}
                    existing={editing}
                    onClose={() => {
                        setShowForm(false);
                        setEditing(null);
                    }}
                    onSaved={handleCreatedOrUpdated}
                />
            )}

            {/* SHARE WINDOW */}
            {showShare && (
                <EventShareWindow
                    event={showShare}
                    user={user}
                    onClose={() => setShowShare(null)}
                    onSent={() => {
                        alert("Invite sent!");
                    }}
                />
            )}
        </div>
    );
};

export default MyEventBoard;
