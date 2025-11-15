// client/src/components/filter_people/connectPeople
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./ConnectPeople.css";
import { openChatWindow } from "../../utils/openChatWindow";

// const ConnectPeople = ({ user, socket, mode = "connection" }) => {
const ConnectPeople = ({ user, socket, mode = "connection", setProfileUserId }) => {

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ location: "", skills: "", available: "" });
  const [filterOptions, setFilterOptions] = useState({ location: [], skills: [], available: [] });
  const [results, setResults] = useState([]);
  const [feedback, setFeedback] = useState({ name: "", comment: "" });
  const [pendingIds, setPendingIds] = useState([]);
  const [notifications, setNotifications] = useState({ sent: [], received: [] });

  const apiMap = {
    connection: {
      endpoint: "connection-request",
      notificationType: "connection"
    },
    team: {
      endpoint: "team/send",
      notificationType: "team"
    },
    challenge: {
      endpoint: "challenge/send",
      notificationType: "challenge"
    }
  };

  const currentMode = apiMap[mode] || apiMap.connection;

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/filter-options")
      .then((res) => {
        setFilterOptions({
          location: res.data.locations || [],
          skills: res.data.skills || [],
          available: res.data.availableOptions || []
        });
      })
      .catch((err) => console.error("Failed to load filters:", err));
  }, []);



  useEffect(() => {
    if (!user?._id) return;

    fetchNotifications(); // 🔁 Important for checking sent/received

    if (mode === "team") {
      setResults(user.members || []);
    } else {
      fetchSuggestions();
    }
  }, [user, mode]);


  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/notifications/${user._id}`);
      const data = res.data[currentMode.notificationType] || { sent: [], received: [] };
      setNotifications(data);
    } catch (err) {
      console.error("❌ Failed to load notifications", err);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await axios.post("http://localhost:5000/api/search-users", {
        searchTerm,
        location: filters.location,
        skills: filters.skills,
        available: filters.available,
        currentUserId: user._id,
        mode
      });
      setResults(res.data);
    } catch (err) {
      console.error("❌ Error loading users:", err.message);
    }
  };

  const handleSearch = () => {
    fetchSuggestions();
  };

  const alreadyConnectedOrRequested = (targetUserId) => {
    const type = mode || "connection";

    const isSent = notifications?.[type]?.sent?.some(
      (n) => n.id?.toString() === targetUserId?.toString()
    );

    const isReceived = notifications?.[type]?.received?.some(
      (n) => n.id?.toString() === targetUserId?.toString()
    );

    const isMutual = user?.members?.some((m) => m._id?.toString() === targetUserId?.toString());

    if (type === "connection") {
      // Hide "Connect" if already connected or pending
      return isSent || isReceived || isMutual;
    }

    if (type === "team" || type === "challenge") {
      // Hide "Invite to Team" or "Challenge" only if request already sent/received
      return isSent || isReceived;
    }

    return false; // default return
  };






  const handleConnect = async (toUser) => {
    setPendingIds((prev) => [...prev, toUser._id]);
    try {
      const res = await axios.post(`http://localhost:5000/api/${currentMode.endpoint}`, {
        from: user._id,
        fromName: user.name,
        fromImage: user.image,
        fromSkills: user.skills,
        to: toUser._id,
        toName: toUser.name,
        toImage: toUser.image
      });

      if (res.data.success) {
        socket.emit("requestSent", { to: toUser._id, type: currentMode.notificationType });
        await fetchNotifications();
      }
    } catch (err) {
      console.error("❌ Error sending request:", err);
    } finally {
      setPendingIds((prev) => prev.filter((id) => id !== toUser._id));
    }
  };

  const handleFeedbackSubmit = async () => {
    await axios.post("http://localhost:5000/api/feedback", {
      userId: user?._id || `guest_${Date.now()}`,
      username: user?.name || "Guest",
      enteredName: feedback.name,
      comment: feedback.comment
    });

    setFeedback({ name: "", comment: "" });
    alert("Thanks for your feedback!");
  };


  const handleViewProfile = (id) => setProfileUserId(id);




  return (
    <div className="connect-container">
      {/* 🔍 Top Section — filters are available in all modes */}
      <div className="top-section">
        <input
          placeholder="Search username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-bar"
        />
        <div className="filters">
          <select onChange={(e) => setFilters({ ...filters, location: e.target.value })}>
            <option value="">Location</option>
            {filterOptions.location.map((loc, idx) => (
              <option key={idx}>{loc}</option>
            ))}
          </select>
          <select onChange={(e) => setFilters({ ...filters, skills: e.target.value })}>
            <option value="">Skills</option>
            {filterOptions.skills.map((s, idx) => (
              <option key={idx}>{s}</option>
            ))}
          </select>
          <select onChange={(e) => setFilters({ ...filters, available: e.target.value })}>
            <option value="">Available For</option>
            {filterOptions.available.map((av, idx) => (
              <option key={idx}>{av}</option>
            ))}
          </select>
          <button onClick={handleSearch}>Search</button>
        </div>
      </div>

      {/* 👥 Results Section */}
      <div className="results-section">
        {results.length > 0 ? (
          results
            .filter((u) => {
              const isSelf = u._id === user._id;
              const isMutual = user?.members?.some((m) => m._id === u._id);
              if (mode === "connection") return !isSelf;
              if (mode === "team" || mode === "challenge") return isMutual && !isSelf;
              return false;
            })
            .map((u) => {

              const showButton = !alreadyConnectedOrRequested(u._id);

              return (
                <div key={u._id} className="user-card">
                  {/* <img src={`/uploads/image/${u.image}`} alt={u.name} /> */}
                  <img
                    src={`/uploads/image/${u.image}`}
                    alt={u.name}
                    onClick={() => handleViewProfile(u._id)}
                    style={{ cursor: "pointer" }}
                  />

                  <div className="user-info">
                    <p>{u.name}</p>
                    <p>{u.skills?.join(", ")}</p>
                  </div>

                  {user?._id && showButton && (
                    <button
                      onClick={() => handleConnect(u)}
                      disabled={pendingIds.includes(u._id)}
                      className="connect-btn"
                    >
                      {pendingIds.includes(u._id)
                        ? "Sending..."
                        : mode === "connection"
                          ? "Connect"
                          : mode === "team"
                            ? "Invite to Team"
                            : "Challenge"}
                    </button>
                  )}

                  {/* ✔ NEW CHAT BUTTON */}
                  <button
                    className="chat-start-btn"
                    onClick={() => openChatWindow(user._id, u._id)}
                    style={{ marginLeft: "10px" }}
                  >
                    💬 Chat
                  </button>



                </div>
              );
            })
        ) : (
          <div className="suggestion-box">
            <h3>People You May Know (Mutuals)</h3>
            {(user?.members || []).map((m) => (
              <div key={m._id} className="user-card">
                <div className="user-info">
                  <img src={`/uploads/image/${m.image}`} alt="profile" />
                  <div className="text-info">
                    <p className="user-name">{m.name}</p>
                    <button
                      className="chat-start-btn"
                      onClick={() => openChatWindow(user._id, m._id)}
                    >
                      💬 Start Chat
                    </button>



                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 💬 Feedback Section */}
      <div className="feedback-section">
        <h2>Got Feedback?</h2>
        <input
          placeholder="Your Name"
          value={feedback.name}
          onChange={(e) => setFeedback({ ...feedback, name: e.target.value })}
        />
        <textarea
          placeholder="Your Comments..."
          value={feedback.comment}
          onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
        />
        <button onClick={handleFeedbackSubmit}>Submit Feedback</button>
      </div>
    </div>
  );


};

export default ConnectPeople;
