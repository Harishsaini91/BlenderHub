// ChatRoom.js
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import io from "socket.io-client";
import "./css/ChatRoom.css";

const BASE_URL = "http://localhost:5000/api";
const SOCKET_URL = "http://localhost:5000";

const socket = io(SOCKET_URL);

const ChatRoom = ({ room, currentUser }) => {
    const [newMessage, setNewMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [file, setFile] = useState(null);
    const chatEndRef = useRef(null);

    const roomId = room?._id || room?.id;

    // 🧠 Save active room in localStorage
    useEffect(() => {
        if (roomId) {
            localStorage.setItem("activeRoomId", roomId);
        }
    }, [roomId]);

    // 📥 Join user to socket
    useEffect(() => {
        if (currentUser?._id) {
            socket.emit("join", currentUser._id);
        }
    }, [currentUser]);

    // 📥 Fetch messages
    useEffect(() => {
        const fetchMessages = async () => {
            if (!roomId) return;

            try {
                const res = await axios.get(`${BASE_URL}/chat/room_all_messages/${roomId}`);
                const all = res.data;

                all.sort((a, b) => new Date(a.time) - new Date(b.time));
                console.log(all);
                setMessages(all);
            } catch (err) {
                console.error("❌ Failed to fetch messages:", err.message);
            }
        };

        fetchMessages();
    }, [roomId]);

    // 🔁 Real-time incoming messages
    useEffect(() => {
        const handleReceive = (data) => {
            if (data.roomId === roomId) {
                setMessages((prev) => [...prev, data.message]);
            }
        };

        socket.on("receive-message", handleReceive);
        return () => socket.off("receive-message", handleReceive);
    }, [roomId]);

    // 📜 Scroll to bottom on update
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // 📤 Send message
    const handleSend = async () => {
        if (!newMessage.trim() && !file) return;

        const formData = new FormData();
        formData.append("senderId", currentUser._id);
        formData.append("senderName", currentUser.name);
        if (newMessage) formData.append("text", newMessage.trim());
        if (file) formData.append("file", file);

        try {
            const res = await axios.post(`${BASE_URL}/chat/message/${roomId}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setMessages((prev) => [
                ...prev,
                {
                    ...res.data,
                    sender: currentUser.name,
                    senderId: currentUser._id,
                    type: res.data.type,
                },
            ]);

            setNewMessage("");
            setFile(null);
        } catch (err) {
            console.error("❌ Failed to send message:", err.message);
        }
    };

    return (
        <div className="chat-room">
            <div className="chat-room-header">
                <h3>{room?.name || "Chat Room"}</h3>
            </div>

            <div className="chat-room-body">
                {messages.map((msg, i) => {
                    const isOwn = msg.senderId === currentUser._id;
                    const content = msg._doc || msg; // fallback for real-time messages

                    if (content.status?.bothDeleted) return null;

                    return (
                        <div key={i} className={`chat-message ${isOwn ? "own" : "other"}`}>
                            {msg.type === "text" && content.text && (
                                <p className="chat-text">{content.text}</p>
                            )}

                            {msg.type === "file" && content.fileUrl && (
                                <div className="chat-file">
                                    {content.fileType?.startsWith("image") ? (
                                        <img src={content.fileUrl} alt="shared" className="shared-img" />
                                    ) : content.fileType?.startsWith("video") ? (
                                        <video src={content.fileUrl} controls className="shared-video" />
                                    ) : (
                                        <a href={content.fileUrl} download={content.fileName}>
                                            📎 {content.fileName}
                                        </a>
                                    )}
                                </div>
                            )}

                            <span className="chat-time">
                                {content.time && !isNaN(new Date(content.time))
                                    ? new Date(content.time).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })
                                    : "unknown time"}
                            </span>
                        </div>
                    );
                })}


                <div ref={chatEndRef} />
            </div>

            <div className="chat-room-footer">
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <label className="file-upload" title="Attach file">
                    📎
                    <input
                        type="file"
                        onChange={(e) => setFile(e.target.files[0])}
                        accept="image/*,video/*,.pdf,.zip,.doc,.docx"
                        style={{ display: "none" }}
                    />
                </label>
                <button onClick={handleSend}>Send</button>
            </div>
        </div>
    );
};

export default ChatRoom;
