// src/components/chat_and_share/chat/NewChatModal.js

import React, { useEffect, useState } from "react";
import chatApi from "./chatApi";
import "assets/styles/components/NewChatModal.css";

const NewChatModal = ({ onClose, currentUser, onCreateRoom, existingRooms }) => {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load connected users
  useEffect(() => {
    async function loadUsers() {
      if (!currentUser?._id) return;

      try {
        const res = await chatApi.fetchMembers(currentUser._id);
        setUsers(res.data || []);
      } catch (err) {
        console.error("Failed to load users:", err);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, [currentUser]);

  // Check if this user already has a chatroom
  function userHasRoom(otherUserId) {
    return existingRooms?.some(
      (r) => String(r.partnerId) === String(otherUserId)
    );
  }

  // Filter out users who already have a chatroom
  const filtered = users
    .filter((u) => !userHasRoom(u._id))
    .filter((u) =>
      u.name.toLowerCase().includes(search.toLowerCase())
    );

  // Select user → return room
  const handleSelectUser = (otherUser) => {
    const existing = existingRooms?.find(
      (r) => String(r.partnerId) === String(otherUser._id)
    );

    if (existing) {
      // open existing room
      const formatted = {
        id: existing.id,
        name: otherUser.name,
        image: otherUser.image || null,
        partnerId: otherUser._id,
        raw: existing,
      };
      onCreateRoom(formatted);
      onClose();
      return;
    }

    // create a temporary room
    const tempRoom = {
      id: null,
      isTemp: true,
      otherId: otherUser._id,
      name: otherUser.name,
      image: otherUser.image || null,
      messages: [],
    };

    onCreateRoom(tempRoom);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-head">
          <h3>Start New Chat</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />

        <div className="users-list">
          {loading ? (
            <p>Loading...</p>
          ) : filtered.length === 0 ? (
            <p>No users available</p>
          ) : (
            filtered.map((u) => (
              <div key={u._id} className="user-row" onClick={() => handleSelectUser(u)}>
                {u.image ? (
                  <img
                    src={`${
                      process.env.REACT_APP_API_URL || "http://localhost:5000"
                    }/uploads/image/${u.image}`}
                    alt={u.name}
                  />
                ) : (
                  <div className="avatar-placeholder">
                    {u.name[0].toUpperCase()}
                  </div>
                )}
                <span>{u.name}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;
