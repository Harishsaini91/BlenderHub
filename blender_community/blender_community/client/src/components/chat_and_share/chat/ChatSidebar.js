// src/components/chat_and_share/chat/ChatSidebar.js

import React, { useEffect, useState, useContext } from "react";
import chatApi from "./chatApi";
import NewChatModal from "./NewChatModal";
import { ChatContext } from "./ChatContext";
import "assets/styles/components/ChatSidebar.css";
const ChatSidebar = ({ user }) => {
  const [rooms, setRooms] = useState([]);
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);

  const { openRoom, onlineUsers } = useContext(ChatContext);

  useEffect(() => {
    if (!user?._id) return;
    loadRooms();
  }, [user]);

  async function loadRooms() {
    try {
      const res = await chatApi.fetchUserRooms(user._id);

      const list = (res.data || []).map((r) => {
        const other = r.members.find(
          (m) => String(m._id) !== String(user._id)
        );

        return {
          id: r._id,
          name: other?.name || "Unknown",
          image: other?.image || null,
          partnerId: other?._id,
          lastMessage: r.lastMessage?.text || "No messages",
          updatedAt: r.updatedAt,
          raw: r,
        };
      });

      list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setRooms(list);
    } catch (err) {
      console.error("Failed to load rooms:", err);
    }
  }

  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <aside className="chat-sidebar">
      <div className="sidebar-top">
        <h3>Chats</h3>
        <button className="new-chat-btn" onClick={() => setShowModal(true)}>
          ➕
        </button>
      </div>

      <div className="sidebar-search">
        <input
          placeholder="Search chats"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="sidebar-list">
        {filtered.length === 0 && <div className="empty">No chats yet</div>}

        {filtered.map((r) => {
          const isOnline = onlineUsers.has(String(r.partnerId));

          return (
            <div key={r.id} className="sidebar-item" onClick={() => openRoom(r)}>
              <div className="avatar">
                {r.image ? (
                  <img
                    src={`${
                      process.env.REACT_APP_API_URL || "http://localhost:5000"
                    }/uploads/image/${r.image}`}
                    alt={r.name}
                  />
                ) : (
                  <div className="initials">{(r.name || "U")[0]}</div>
                )}

                {isOnline && <span className="green-dot" />}
              </div>

              <div className="meta">
                <div className="meta-top">
                  <strong>{r.name}</strong>
                  <span className="time">
                    {new Date(r.updatedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="meta-bottom">{r.lastMessage}</div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <NewChatModal
          currentUser={user}
          existingRooms={rooms}     // 🔥 pass rooms here
          onClose={() => setShowModal(false)}
          onCreateRoom={(room) => {
            setRooms((prev) => [
              room,
              ...prev.filter((r) => r.id !== room.id),
            ]);
            setShowModal(false);
            openRoom(room);
          }}
        />
      )}
    </aside>
  );
};

export default ChatSidebar;
