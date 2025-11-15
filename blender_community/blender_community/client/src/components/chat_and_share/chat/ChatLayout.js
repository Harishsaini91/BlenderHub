// src/components/chat_and_share/chat/ChatLayout.js

import React, { useEffect, useContext } from "react";
import { ChatContext } from "./ChatContext";
import ChatSidebar from "./ChatSidebar";
import ChatRoom from "./ChatRoom";
import chatApi from "./chatApi";
import "assets/styles/components/ChatLayout.css";
const ChatLayout = ({ user, openWithUserId }) => {
  const { activeRoom, setActiveRoom, openRoom } = useContext(ChatContext);

  /* ==========================================================
     AUTO-OPEN HANDLER
     - If user visits /chat normally → show only sidebar
     - If user clicks "Chat With" → preload room
  ========================================================== */
  useEffect(() => {
    if (!user?._id) return;

    async function autoStartChat() {
      // 🅰 CASE 1 — NO TARGET USER → Sidebar only
      if (!openWithUserId) return;

      // 🅱 CASE 2 — USER CLICKED "CHAT WITH X"
      try {
        const res = await chatApi.fetchUserRooms(user._id);
        const rooms = res.data || [];

        // Check for existing room
        const existing = rooms.find((room) =>
          room.members.some((m) => String(m._id) === String(openWithUserId))
        );

        if (existing) {
          // 🟢 Open existing room
          const other = existing.members.find(
            (m) => String(m._id) !== String(user._id)
          );

          const formatted = {
            id: existing._id,
            name: other?.name || "User",
            image: other?.image || null,
            partnerId: other?._id,
            raw: existing,
          };

          setActiveRoom(formatted);
          openRoom(formatted);
          return;
        }

        // 🔴 TEMP ROOM if no room exists yet
        const tempRoom = {
          id: null,
          isTemp: true,
          otherId: openWithUserId,
          name: "New Chat",
          image: null,
          messages: [],
        };

        setActiveRoom(tempRoom);
        openRoom(tempRoom);
      } catch (err) {
        console.error("Auto-start chat failed:", err);
      }
    }

    autoStartChat();
  }, [openWithUserId, user]);

  /* ==========================================================
     UI STRUCTURE
  ========================================================== */
  return (
    <div className="chat-layout">
      {/* LEFT SIDE (Sidebar with chat list + new chat btn) */}
      <ChatSidebar user={user} />

      {/* RIGHT SIDE (Main chat panel) */}
      <main className="chat-main">
        {activeRoom ? (
          <ChatRoom room={activeRoom} currentUser={user} />
        ) : (
          <div className="chat-welcome">
            <h2>Welcome to BlenderHub Chat</h2>
            <p>Select a chat or start a conversation.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ChatLayout;
