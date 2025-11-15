// client/src/pages/EventDashboard.js
import React, { useState } from "react";
import EventList from "../components/events/EventList";
import MyEventBoard from "../components/events/MyEventBoard";

const EventDashboard = ({ user }) => {
  // Load user if not passed as prop
  const storedUser =
    user ||
    (() => {
      try {
        const raw =
          sessionStorage.getItem("user") || localStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();

  const [activeKey, setActiveKey] = useState("Event Board");

  return (
    <div className="event-dashboard-container">

      {/* =============== LEFT SIDEBAR =============== */}
      <div className="event-sidebar">
        <button
          className={`sidebar-btn ${
            activeKey === "Event Board" ? "active" : ""
          }`}
          onClick={() => setActiveKey("Event Board")}
        >
          🌍 Event Board
        </button>

        <button
          className={`sidebar-btn ${
            activeKey === "My Created Events" ? "active" : ""
          }`}
          onClick={() => setActiveKey("My Created Events")}
        >
          🎯 My Created Events
        </button>
      </div>

      {/* =============== RIGHT MAIN CONTENT =============== */}
      <div className="event-main">
        {activeKey === "Event Board" && (
          <div className="page-section">
            <EventList user={storedUser} />
          </div>
        )}

        {activeKey === "My Created Events" && (
          <div className="page-section">
            <MyEventBoard user={storedUser} />
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDashboard;
 