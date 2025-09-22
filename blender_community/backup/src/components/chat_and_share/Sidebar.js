// src/components/chat_and_share/Sidebar.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import NewChatModal from "./NewChatModal";
import io from "socket.io-client";
import "./css/Sidebar.css";

const BASE_URL = "http://localhost:5000/api";
const socket = io("http://localhost:5000");

const Sidebar = ({ user, onSelectRoom, activeRoom }) => {
  const [rooms, setRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);

// 📦 Load from sessionStorage on mount
useEffect(() => {
  const saved = sessionStorage.getItem("rooms");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) setRooms(parsed);
    } catch (err) {
      console.error("Failed to parse saved rooms:", err.message);
    }
  }
}, []);

// 🌐 Fetch from backend + setup real-time listener
useEffect(() => {
  if (!user?._id) return;

  const fetchUserRooms = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/chat/user-rooms/${user._id}`);
      const userRooms = res.data;

      const formattedRooms = userRooms.map((room) => {
        const otherUser = room.members.find(
          (m) => m._id.toString() !== user._id.toString()
        );

        return {
          id: room._id,
          name: otherUser?.name || "Unknown",
          image: otherUser?.image || null,
          isOnline: otherUser?.isOnline || false,
          members: room.members,
          lastMessage: room.lastMessage?.text || "No messages yet",
          messages: room.messages || [],
          updatedAt: room.updatedAt,
        };
      });

      // Sort by updatedAt (latest on top)
      formattedRooms.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      setRooms(formattedRooms);
    } catch (err) {
      console.error("Failed to fetch rooms:", err.message);
    }
  };

  fetchUserRooms();

  socket.on("room-update", fetchUserRooms); // Listen for updates

  return () => {
    socket.off("room-update", fetchUserRooms); // Cleanup on unmount
  };
}, [user]);

// 💾 Save to sessionStorage whenever rooms change
useEffect(() => {
  sessionStorage.setItem("rooms", JSON.stringify(rooms));
}, [rooms]);


  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="sidebar">
      {/* 🔍 Search & Create */}
      <div className="sidebar-header">
        <input
          type="text"
          placeholder="Search chats..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="new-chat-btn" onClick={() => setShowModal(true)}>➕</button>
      </div>

      {/* 🔁 Rooms List */}
      <div className="room-list">
        {filteredRooms.map((room) => (
          <div
            key={room.id}
            className={`room-item ${activeRoom?.id === room.id ? "active" : ""}`}
            onClick={() => onSelectRoom(room)}
          >
            <div className="avatar">
              {room.image ? (
                <img src={`http://localhost:5000/uploads/image/${room.image}`} alt="avatar" />
              ) : (
                room.name[0]
              )}
            </div>

            <div className="room-info">
              <div className="room-name">
                {room.name}{" "}
                <span className={`status-dot ${room.isOnline ? "online" : "offline"}`}>
                  {room.isOnline ? "(Online)" : "(Offline)"}
                </span>
              </div>
              <div className="last-message">{room.lastMessage}</div>
            </div>
          </div>
        ))}

        {filteredRooms.length === 0 && <p className="no-results">No chats found.</p>}
      </div>

      {/* ➕ Modal */}
      {showModal && (
        <NewChatModal
          currentUser={user}
          onClose={() => setShowModal(false)}
          onCreateRoom={(room) => {
            setRooms((prev) => [room, ...prev.filter((r) => r.id !== room.id)]);
            onSelectRoom(room);
          }}
        />
      )}
    </div>
  );
};

export default Sidebar;
