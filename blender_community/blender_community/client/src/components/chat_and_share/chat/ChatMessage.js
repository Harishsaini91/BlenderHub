// blender_community\blender_community\client\src\components\chat_and_share\chat\ChatMessage.js

import React from "react";
import "assets/styles/components/ChatMessage.css";
const ChatMessage = ({ msg, isOwn }) => {
  const time = msg.time ? new Date(msg.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div className={`chat-bubble ${isOwn ? "own" : "other"}`}>
      {msg.type === "text" && <div className="bubble-text">{msg.text}</div>}

      {msg.type === "file" && msg.fileUrl && (
        <div className="bubble-file">
          {msg.fileType && msg.fileType.startsWith("image") ? (
            <img src={msg.fileUrl} alt={msg.fileName} />
          ) : msg.fileType && msg.fileType.startsWith("video") ? (
            <video src={msg.fileUrl} controls />
          ) : (
            <a href={msg.fileUrl} download={msg.fileName}>📎 {msg.fileName}</a>
          )}
        </div>
      )}

      <div className="bubble-time">{time}</div>
    </div>
  );
};

export default ChatMessage;
