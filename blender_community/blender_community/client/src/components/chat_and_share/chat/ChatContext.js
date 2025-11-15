// blender_community\blender_community\client\src\components\chat_and_share\chat\ChatContext.js
import React, { createContext, useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";

export const ChatContext = createContext();

export const ChatProvider = ({ children, user }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [activeRoom, setActiveRoom] = useState(null);

  /* ============================================================
     1️⃣  INIT SOCKET.IO 
  ============================================================ */
  useEffect(() => {
    if (!user?._id) return;

    const serverUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";

    const s = io(serverUrl, {
      auth: { userId: user._id },
    });

    s.on("connect", () => {
      s.emit("join", user._id); // join personal room
    });

    // Presence (optional)
    s.on("user_online", (id) => {
      setOnlineUsers((prev) => new Set(prev).add(String(id)));
    });

    s.on("user_offline", (id) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(String(id));
        return next;
      });
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user]);

  /* ============================================================
     2️⃣  CREATE a TEMP ROOM (before first message)
     Used when: /chat?user=xxxx
  ============================================================ */
  const startTempRoom = useCallback(
    (otherUserId) => {
      if (!otherUserId) return;

      const tempRoom = {
        id: null,
        isTemp: true,
        otherId: otherUserId,
        name: "Loading...",
        image: null,
        messages: [],
      };

      setActiveRoom(tempRoom);

      // (Optional) You can load user preview here
    },
    []
  );

  /* ============================================================
     3️⃣  OPEN ROOM (permanent or temp)
  ============================================================ */
  const openRoom = useCallback(
    (room) => {
      setActiveRoom(room);

      // Join actual room if it exists
      if (room?.id && socket) {
        socket.emit("joinChat", room.id);
      }
    },
    [socket]
  );

  return (
    <ChatContext.Provider
      value={{
        socket,
        onlineUsers,
        activeRoom,
        setActiveRoom,
        openRoom,
        startTempRoom, // 🔥 new helper
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
