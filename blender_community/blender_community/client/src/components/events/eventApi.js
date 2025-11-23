// client/src/components/events/eventApi.js
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
const BASE = `${API_BASE}/api/events`;

/* ======================================================
   🔐 AUTH HEADER HELPER
   Accepts token OR auto-picks from session/local storage
====================================================== */
function authHeader(token) {
  const t =
    token ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

  return t ? { Authorization: `Bearer ${t}` } : {};
}

/* ======================================================
   🎯 CREATE EVENT  (multipart)
====================================================== */
export const createEvent = (formData, token) =>
  axios.post(`${BASE}/create`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      ...authHeader(token),
    },
  });

/* ======================================================
   🌍 PUBLIC EVENT BOARD
====================================================== */
export const fetchEvents = () => axios.get(`${BASE}/list`);

/* ======================================================
   👤 MY CREATED EVENTS
====================================================== */
export const fetchMyEvents = (token) =>
  axios.get(`${BASE}/mine`, { headers: authHeader(token) });

/* ======================================================
   📄 EVENT DETAIL
====================================================== */
export const fetchEventById = (idOrLink, passkey = null, preview = false) =>
  axios.get(`${BASE}/${idOrLink}`, {
    params: { passkey, preview },
  });


/* ======================================================
   ✏ UPDATE EVENT  (multipart)
====================================================== */
export const updateEvent = (id, formData, token) =>
  axios.put(`${BASE}/update/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      ...authHeader(token),
    },
  });

/* ======================================================
   🗑 DELETE EVENT
====================================================== */
export const deleteEvent = (id, token) =>
  axios.delete(`${BASE}/${id}`, { headers: authHeader(token) });

/* ======================================================
   ⭐ INTERACTIONS  (like, vote, remind, comment)
====================================================== */
export const interactEvent = (id, body, token) =>
  axios.post(`${BASE}/${id}/interact`, body, {
    headers: {
      "Content-Type": "application/json",
      ...authHeader(token),
    },
  });

/* ======================================================
   📤 OLD SHARE ENDPOINT (Still supported)
====================================================== */
export const shareEvent = (payload, token) =>
  axios.post(`${BASE}/share`, payload, {
    headers: {
      "Content-Type": "application/json",
      ...authHeader(token),
    },
  });

/* ======================================================
   🔍 SEARCH USERS (GLOBAL search-users route)
====================================================== */
export const searchUsers = (term, token) =>
  axios.post(
    `${API_BASE}/api/search-users`,
    { searchTerm: term || "" },
    { headers: { "Content-Type": "application/json", ...authHeader(token) } }
  );

/* ======================================================
   🔐 VERIFY PRIVATE EVENT PASSKEY
====================================================== */
export const verifyEventPasskey = (eventIdOrLink, passkey) =>
  axios.post(
    `${BASE}/verify`,
    { eventIdOrLink, passkey },
    { headers: { "Content-Type": "application/json", ...authHeader() } }
  );

/* ======================================================
   🔍 NEW — SEARCH USERS BY NAME (events router)
   Used in EventShareWindow (fast username search)
====================================================== */
export const searchUsersByName = (searchTerm, token) => {
  let excludeId = undefined;

  try {
    const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (raw) excludeId = JSON.parse(raw)._id;
  } catch {}

  return axios.post(
    `${BASE}/search-users`,
    { searchTerm, exclude: excludeId },
    { headers: { "Content-Type": "application/json", ...authHeader(token) } }
  );
};

/* ======================================================
   📤 NEW — SHARE TO USERS (EMAIL + NOTIFICATION)
   eventId, receivers[], subject, message
====================================================== */
export const shareToUsers = (payload, token) =>
  axios.post(`${BASE}/share-to-users`, payload, {
    headers: {
      "Content-Type": "application/json",
      ...authHeader(token),
    },
  });


export const participateEvent = (id, data, token) =>
  axios.post(`${BASE}/${id}/participate`, data, {
    headers: { "Content-Type": "application/json", ...authHeader(token) },
  });

export const participateStart = (id, data) =>
  axios.post(`${BASE}/${id}/participate/start`, data);

export const verifyOtp = (id, data) =>
  axios.post(`${BASE}/${id}/participate/verify`, data);

export const saveParticipation = (id, data) =>
  axios.post(`${BASE}/${id}/participate/save`, data);


export async function submitSoloParticipation(eventId, data, token) {
  return axios.post(
    `${BASE}/${eventId}/participate/solo`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

export async function submitTeamParticipation(eventId, data, token) {
  return axios.post(
    `${BASE}/${eventId}/participate/team`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

// 
 
 
export function markWinner(eventId, participantId, position, token) {
  return axios.put(
    `${BASE}/${eventId}/mark-winner`,
    { participantId, position },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}




/* ======================================================
   DEFAULT EXPORT
====================================================== */
export default {
  createEvent,
  fetchEvents,
  fetchMyEvents,
  fetchEventById,
  updateEvent,
  deleteEvent,
  interactEvent,
  shareEvent,
  searchUsers,
  verifyEventPasskey,
  searchUsersByName,
  shareToUsers,
  participateEvent ,
  participateStart ,
  verifyOtp ,
  saveParticipation ,
  submitSoloParticipation ,
  submitTeamParticipation ,
  markWinner

};
 