// client/src/components/notification/TeamRequests.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import moment from "moment";
// import "./ConnectionRequests.css"; 

const TeamRequests = ({ socket }) => {
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [activeView, setActiveView] = useState("received");
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error("❌ Failed to parse user from sessionStorage:", e);
      return null;
    }
  });

  useEffect(() => {
    if (!user?._id) return;
    fetchAll();
    socket.emit("join", user._id);
    socket.on("receiveTeamUpdate", fetchAll);
    return () => socket.off("receiveTeamUpdate", fetchAll);
  }, [user?._id]);

  if (!user || !user._id) return <p>Loading team requests...</p>;

  const fetchAll = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/notifications/${user._id}`);
      const receivedData = res.data.team?.received || [];
      const sentData = res.data.team?.sent || [];
      setReceived(receivedData);
      setSent(sentData);
    } catch (err) {
      console.error("❌ Failed to fetch team requests", err);
    }
  };

  const handleRespond = async (notifId, decision, senderId) => {
    try {
      const res = await axios.post(`http://localhost:5000/api/team/respond`, {
        userId: user._id,
        senderId,
        decision,
        type: "team"
      });
      socket.emit("teamResponse", { to: senderId });
      fetchAll();
    } catch (err) {
      console.error("❌ Failed to respond to team request:", err);
    }
  };

  const getFormattedTime = (dateStr) => {
    const now = moment();
    const date = moment(dateStr);
    const diffDays = now.diff(date, 'days');
    const diffMonths = now.diff(date, 'months');
    const diffYears = now.diff(date, 'years');

    if (diffDays === 0) return `Today at ${date.format("h:mm A")}`;
    if (diffDays <= 7) return date.format("dddd");
    if (diffMonths === 0) return `${Math.floor(diffDays / 7)} week(s) ago`;
    if (diffYears === 0) return `${diffMonths} month(s) ago`;
    return `${diffYears} year(s) ago`;
  };

  return (
    <div className="connection-requests-container">
      <div className="tabs">
        <button
          className={activeView === "received" ? "active-tab" : ""}
          onClick={() => setActiveView("received")}
        >
          Received Requests
        </button>
        <button
          className={activeView === "sent" ? "active-tab" : ""}
          onClick={() => setActiveView("sent")}
        >
          Sent Requests
        </button>
      </div>

      {activeView === "received" ? (
        <div className="requests-list">
          {received.length === 0 ? (
            <p>No received team requests.</p>
          ) : (
            received.map((req, i) => (
              <div key={i} className="request-card inline">
                <img src={`http://localhost:5000/uploads/image/${req.image}`} alt="profile" />
                <div className="d">
                  <strong>{req.name}</strong>
                  <div className="skills-list">
                    {req.skills?.map((skill, idx) => (
                      <span key={idx} className="skill-badge">{skill}</span>
                    ))}
                  </div>
                  <p className="status-time">pending • {getFormattedTime(req.date)}</p>
                </div>
                <div className="btns">
                  <button onClick={() => handleRespond(req._id, "accepted", req.id)}>Accept</button>
                  <button onClick={() => handleRespond(req._id, "rejected", req.id)}>Reject</button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="requests-list">
          {sent.length === 0 ? (
            <p>No sent team requests.</p>
          ) : (
            sent.map((req, i) => (
              <div key={i} className="request-card sent inline">
                <img src={`http://localhost:5000/uploads/image/${req.image}`} alt="profile" />
                <div className="d">
                  <strong>{req.name}</strong>
                  <p className="status-time">{req.status} • {getFormattedTime(req.date)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TeamRequests;
