// src/components/chat_and_share/NewChatModal.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./css/NewChatModal.css";

const BASE_URL = "http://localhost:5000/api";

const NewChatModal = ({ onClose, currentUser, onCreateRoom }) => {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/chat/members/${currentUser._id}`);
        setUsers(res.data);
      } catch (err) {
        console.error("❌ Error fetching members:", err.message);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser?._id) fetchMembers();
  }, [currentUser]);

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectUser = async (user) => {
    try {
      const res = await axios.post(`${BASE_URL}/chat/room`, {
        userId: currentUser._id,
        username: currentUser.name,
        otherId: user._id,
        othername: user.name,
      });

      const room = res.data;

      const newRoom = {
        id: room._id,
        name: user.name,
        image: user.image,
        members: [currentUser, user],
        messages: room.messages || [],
        lastMessage: room.lastMessage?.text || "",
      };

      onCreateRoom?.(newRoom);
    } catch (err) {
      console.error("❌ Error creating chat room:", err.message);
    }

    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h3>Start New Chat</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <input
          className="search-input"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="user-list">
          {loading ? (
            <p className="loading">Loading users...</p>
          ) : filtered.length > 0 ? (
            filtered.map((user) => (
              <div
                key={user._id}
                className="user-item"
                onClick={() => handleSelectUser(user)}
              >
                <img
                  src={user.image ? `http://localhost:5000/uploads/image/${user.image}` : "/default-avatar.png"}
                  alt={user.name}
                  className="user-avatar"
                />
                <span className="user-name">{user.name}</span>
              </div>
            ))
          ) : (
            <p className="no-users">No users found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;
