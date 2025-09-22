import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import ConnectionRequests from "./friend_request/ConnectionRequests";
import TeamRequests from "./team_request/TeamRequests";
import ConnectPeople from "../filter_people/ConnectPeople";
import "./NotificationComponent.css";

  import ChallengeRequests from "./Challenge_request/ChallengeRequests";

const socket = io("http://localhost:5000");

const tabs = [
  "Connection Requests",
  "Team Requests",
  "Challenge Reminders",
  "Other"
];

const NotificationComponent = ({ user }) => {
  const [activeTab, setActiveTab] = useState("Connection Requests");
  const [connectionSubTab, setConnectionSubTab] = useState("Received");

  // ✅ Always call hook, guard logic inside
  useEffect(() => {
    if (!user || !user._id) return;

    socket.emit("join", user._id);

    socket.on("new-notification", (data) => {
      console.log("🔔 Incoming notification", data);
    });

    return () => {
      socket.off("new-notification");
    };
  }, [user]);

  // ✅ Safe early return after hooks
  if (!user || !user._id) {
    return <p className="not-logged-in-msg">⚠ Please login first to view notifications.</p>;
  }

  const renderConnectionRequests = () => (
    <>
      <div className="connection-tabs">
        <button
          className={connectionSubTab === "Received" ? "active-sub" : ""}
          onClick={() => setConnectionSubTab("Received")}
        >
          View Connection Requests
        </button>
        <button
          className={connectionSubTab === "Search" ? "active-sub" : ""}
          onClick={() => setConnectionSubTab("Search")}
        >
          Send Connection Request
        </button>
      </div>

      <div className="connection-tab-content">
        {connectionSubTab === "Received" ? (
          <ConnectionRequests userId={user._id} socket={socket} />
        ) : (
          <ConnectPeople user={user} mode="connection" />
          
        )}
      </div>
    </>
  );


  const renderTeamRequests = () => (
    <>
      <div className="connection-tabs">
        <button
          className={connectionSubTab === "Received" ? "active-sub" : ""}
          onClick={() => setConnectionSubTab("Received")}
        >
          View Team Requests

        </button>
        <button
          className={connectionSubTab === "Search" ? "active-sub" : ""}
          onClick={() => setConnectionSubTab("Search")}
        >
          Send Team Request
        </button>
      </div>

      <div className="connection-tab-content">
        {connectionSubTab === "Received" ? (
          <TeamRequests socket={socket} />
        ) : (
          <ConnectPeople user={user} mode ="team"/>
        )}
      </div>
    </>
  );


  // In renderChallengeRequests()
  const renderChallengeRequests = () => (
    <>
      <div className="connection-tabs">
        <button
          className={connectionSubTab === "Received" ? "active-sub" : ""}
          onClick={() => setConnectionSubTab("Received")}
        >
          View Challenge Invites
        </button>
        <button
          className={connectionSubTab === "Search" ? "active-sub" : ""}
          onClick={() => setConnectionSubTab("Search")}
        >
          Send Challenge Invite
        </button>
      </div>

      <div className="connection-tab-content">
        {connectionSubTab === "Received" ? (
          <ChallengeRequests socket={socket} />
        ) : (
          <ConnectPeople user={user} socket={socket} mode="challenge" />
        )}
      </div>
    </>
  );


  const renderActiveTab = () => {
    switch (activeTab) {
      case "Connection Requests":
        return renderConnectionRequests();
      case "Team Requests":
        return renderTeamRequests();

      case "Challenge Reminders":
        return renderChallengeRequests();
      case "Other":
        return <p>Other notifications go here.</p>;
      default:
        return null;
    }
  };

  return (
    <div className="notification-wrapper">
      <h2>🔔 Notifications</h2>
      <div className="tabs">
        {tabs.map((tab) => (
          <div
            key={tab}
            className={`tab ${tab === activeTab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </div>
        ))}
      </div>
      <div className="tab-content">{renderActiveTab()}</div>
    </div>
  );
};

export default NotificationComponent;
