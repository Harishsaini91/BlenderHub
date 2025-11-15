// src/components/chat_and_share/chat/ChatRoom.js

import React, { useContext, useEffect, useRef, useState } from "react";
import { ChatContext } from "./ChatContext";
import chatApi from "./chatApi";
import ChatMessage from "./ChatMessage";
import "assets/styles/components/ChatRoom.css";
const ChatRoom = ({ room, currentUser }) => {
  const { socket } = useContext(ChatContext);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const endRef = useRef();

  const isTempRoom = room?.isTemp === true;
  const roomId = room?.id; 


/* ==========================================================
   CLEAR CHAT WHEN ROOM CHANGES (IMPORTANT FIX)
========================================================== */
useEffect(() => {
  // Reset UI when switching to a new user or new temp room
  setMessages([]);
  setText("");
  setFile(null);
}, [room?.id, room?.otherId]);



  /* ==========================================================
     LOAD EXISTING ROOM MESSAGES
  ========================================================== */
  useEffect(() => {
    if (!roomId) return; // temp → no load

    async function loadMessages() {
      try {
        const res = await chatApi.fetchRoomMessages(roomId);
        const msgList = (res.data || []).map((m) => ({
          senderId: m.senderId,
          senderName: m.senderName,
          type: m.type,
          text: m.text,
          fileUrl: m.fileUrl,
          fileName: m.fileName,
          fileType: m.fileType,
          time: m.time,
        }));

        setMessages(msgList);

        if (socket) socket.emit("joinChat", roomId);
      } catch (err) {
        console.error("Failed loading messages:", err);
      }
    }

    loadMessages();
  }, [roomId, socket]);

  /* ==========================================================
     SOCKET LISTENER FOR INCOMING MESSAGES
  ========================================================== */
  useEffect(() => {
    if (!socket) return;

    const handler = (payload) => {
      if (payload.roomId !== roomId) return;
      setMessages((prev) => [...prev, payload.message]);
    };

    socket.on("newMessageReceived", handler);

    return () => socket.off("newMessageReceived", handler);
  }, [socket, roomId]);

  /* Scroll to bottom when messages update */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ==========================================================
     SEND FIRST MESSAGE → CREATE ROOM
  ========================================================== */
  async function sendFirstMessage() {
    if (!text.trim() && !file) return;

    const fd = new FormData();
    fd.append("senderId", currentUser._id);
    fd.append("senderName", currentUser.name);
    fd.append("receiverId", room.otherId);

    // name for header before room is created
    fd.append("receiverName", room.name || "User");

    if (text) fd.append("text", text);
    if (file) fd.append("file", file);

    try {
      const token =
        currentUser.token ||
        sessionStorage.getItem("token") ||
        localStorage.getItem("token");

      const res = await chatApi.createRoomWithMessage(fd, token);

      if (!res.data.success) {
        alert("Failed to create new chat");
        return;
      }

      const newRoomId = res.data.roomId;

      // TEMP → REAL
      room.id = newRoomId;
      room.isTemp = false;

      // fetch new full messages
      const full = await chatApi.fetchRoomMessages(newRoomId);
      setMessages(full.data || []);

      // join socket room
      if (socket) socket.emit("joinChat", newRoomId);

      // reset inputs
      setText("");
      setFile(null);
    } catch (err) {
      console.error("Error creating first message:", err);
    }
  }

  /* ==========================================================
     SEND NORMAL MESSAGE (existing room)
  ========================================================== */
  async function sendNormalMessage() {
    if (!roomId) return;

    const fd = new FormData();
    fd.append("senderId", currentUser._id);
    fd.append("senderName", currentUser.name);

    if (text) fd.append("text", text);
    if (file) fd.append("file", file);

    try {
      const token =
        currentUser.token ||
        sessionStorage.getItem("token") ||
        localStorage.getItem("token");

      const res = await chatApi.sendMessage(roomId, fd, token);

      const createdMsg = {
        senderId: currentUser._id,
        senderName: currentUser.name,
        type: res.data.type,
        text: res.data.text || "",
        fileUrl: res.data.fileUrl || "",
        fileName: res.data.fileName || "",
        fileType: res.data.fileType || "",
        time: res.data.time,
      };

      setMessages((prev) => [...prev, createdMsg]);

      setText("");
      setFile(null);
    } catch (err) {
      console.error("Send normal message error:", err);
    }
  }

  /* ==========================================================
     MASTER SEND HANDLER
  ========================================================== */
  function handleSend() {
    if (!text.trim() && !file) return;

    if (isTempRoom || !roomId) return sendFirstMessage();

    return sendNormalMessage();
  }

  /* ==========================================================
     UI
  ========================================================== */
  return (
    <div className="chat-room-panel">
      {/* HEADER */}
      <div className="chat-room-header">
        <h4>{room.name}</h4>
      </div>

      {/* MESSAGES */}
      <div className="chat-room-messages">
        {messages.map((m, i) => (
          <ChatMessage
            key={i}
            msg={m}
            isOwn={String(m.senderId) === String(currentUser._id)}
          />
        ))}
        <div ref={endRef} />
      </div>

      {/* INPUT SECTION */}
      <div className="chat-room-input">
        <input
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />

        <label className="file-btn">
          📎
          <input
            type="file"
            style={{ display: "none" }}
            onChange={(e) => setFile(e.target.files[0])}
          />
        </label>

        <button className="send-btn" onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatRoom;
