// blender_community\blender_community\client\src\components\chat_and_share\chat\chatApi.js
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
const BASE = `${API_BASE}/api/chat`;

// Attach token
function authHeader(token) {
  const t =
    token ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ========== FETCH USERS (members) ==========
export const fetchMembers = (userId) =>
  axios.get(`${BASE}/members/${userId}`);

// ========== CREATE EMPTY ROOM (old method) ==========
export const createRoom = (payload) =>
  axios.post(`${BASE}/room`, payload);

// ========== CREATE ROOM + FIRST MESSAGE ==========
export const createRoomWithMessage = (formData, token) =>
  axios.post(`${BASE}/room/create_with_message`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      ...authHeader(token),
    },
  });

// ========== FETCH ALL ROOMS ==========
export const fetchUserRooms = (userId) =>
  axios.get(`${BASE}/user-rooms/${userId}`);

// ========== FETCH ALL MESSAGES OF A ROOM ==========
export const fetchRoomMessages = (roomId) =>
  axios.get(`${BASE}/room_all_messages/${roomId}`);

// ========== SEND MESSAGE TO EXISTING ROOM ==========
export const sendMessage = (roomId, formData, token) =>
  axios.post(`${BASE}/message/${roomId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      ...authHeader(token),
    },
  });

export default {
  fetchMembers,
  createRoom,
  createRoomWithMessage,
  fetchUserRooms,
  fetchRoomMessages,
  sendMessage,
};
