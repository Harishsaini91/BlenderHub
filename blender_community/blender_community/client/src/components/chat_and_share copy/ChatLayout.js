// src/components/chat_and_share/ChatLayout.js

import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import ChatRoom from "./ChatRoom";
import "./css/ChatLayout.css";

const ChatLayout = () => {
  const [activeRoom, setActiveRoom] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // ✅ Load current user from sessionStorage or localStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed._id) {
          setCurrentUser(parsed);
        }
      } catch (e) {
        console.error("Failed to parse user data:", e);
      }
    }
  }, []);



  
  // 🔄 Show loading state if user is not available
  if (!currentUser) {
    return (
      <div className="chat-layout loading-state">
        <p>🔄 Loading chat interface...</p>
      </div>
    );
  }

  return (
    <div className="chat-layout">
      {/* 📋 Sidebar for listing rooms and creating new chats */}
      <Sidebar
        user={currentUser}
        onSelectRoom={setActiveRoom}
        activeRoom={activeRoom}
      />

      {/* 💬 Main chat window or welcome message */}
      {activeRoom ? (
        <ChatRoom
          key={activeRoom.id || activeRoom._id} // Forces re-render when room changes
          room={activeRoom}
          currentUser={currentUser}
        />
      ) : (
        <div className="no-chat">
          <h2>Welcome, {currentUser.name}</h2>
          <p>Select or start a chat to begin messaging or collaboration.</p>
        </div>
      )}
    </div>
  );
};

export default ChatLayout;
