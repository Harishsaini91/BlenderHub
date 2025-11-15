// src/pages/ChatWindowPage.js

import React from "react";
import { useLocation } from "react-router-dom";
import { ChatProvider } from "../components/chat_and_share/chat/ChatContext";
import ChatLayout from "../components/chat_and_share/chat/ChatLayout";

const ChatWindowPage = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const selfId = params.get("self");      // current logged in user
  const otherId = params.get("with");     // optional selected user

  // Get logged user from storage
  const loggedUser = JSON.parse(
    sessionStorage.getItem("user") ||
    localStorage.getItem("user") ||
    "{}"
  );

  // 🚨 SAFETY CHECK
  if (!loggedUser?._id) {
    return <h2>Please login to access chat.</h2>;
  }

  // 🚨 Prevent fake /chat?self=xxxx
  if (String(loggedUser._id) !== String(selfId)) {
    return <h2>Invalid session. Please login again.</h2>;
  }

  return (
    <ChatProvider user={loggedUser}>
      <ChatLayout 
        user={loggedUser} 
        openWithUserId={otherId}   // this is what auto-opens target user chat
      />
    </ChatProvider>
  );
};

export default ChatWindowPage;
