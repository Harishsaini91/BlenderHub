 

// client/src/components/notification/ConnectionRequests.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import moment from "moment";
import "assets/styles/components/ConnectionRequests.css";


const ConnectionRequests = ({ socket }) => {
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

    console.log("🟡 User ID in useEffect:", user._id);
    fetchAll();

    socket.emit("join", user._id);
    socket.on("receiveConnectionUpdate", fetchAll);

    return () => {
      socket.off("receiveConnectionUpdate", fetchAll);
    };
  }, [user?._id]);

  if (!user || !user._id) {
  return <p>Loading notifications...</p>;
}


  const fetchAll = async () => {
    try {
      console.log(`📡 Calling -> http://localhost:5000/api/notifications/${user._id}`);
      const res = await axios.get(`http://localhost:5000/api/notifications/${user._id}`);
      const receivedData = res.data.connection?.received || [];
      const sentData = res.data.connection?.sent || [];

      setReceived(receivedData);
      setSent(sentData);

      sessionStorage.setItem("notifications", JSON.stringify({ received: receivedData, sent: sentData }));

      console.log("✅ Received Requests:", receivedData);
      console.log("✅ Sent Requests:", sentData);
    } catch (err) {
      console.error("❌ Failed to fetch connection requests", err);
    }
  };

const handleRespond = async (notifId, decision, senderId) => {
  try {
    const res = await axios.post(`http://localhost:5000/api/respond`, {
      notificationId: notifId,
      decision,
      userId: user._id,
      senderId,
    });

    // Emit socket update for real-time sync
    socket.emit("connectionResponse", { to: senderId });

    // 🧹 If rejected, clean from session/localStorage manually
    if (decision === "rejected") {
      const stored = sessionStorage.getItem("notifications");
      if (stored) {
        const parsed = JSON.parse(stored);
        const updatedReceived = parsed.received?.filter(req => req._id !== notifId) || [];
        const updatedSent = parsed.sent || [];
        sessionStorage.setItem(
          "notifications",
          JSON.stringify({ received: updatedReceived, sent: updatedSent })
        );
      }
    }

    // 🔄 Re-fetch updated list
    fetchAll();
  } catch (err) {
    console.error("❌ Failed to respond to request:", err);
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

  if (!user || !user._id) {
    return <p>Loading notifications...</p>;
  }

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
          <p>No received requests.</p>
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
          <p>No sent requests.</p>
        ) : (
          sent.map((req, i) => (
            <div key={i} className="request-card sent inline">
              <img src={`http://localhost:5000/uploads/image/${req.image}`} alt="profile" />
              <div className="d">
                <strong>{req.name}</strong>
                <p className="status-time">
                  {req.status} • {getFormattedTime(req.date)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    )}
  </div>
);

};

export default ConnectionRequests;
