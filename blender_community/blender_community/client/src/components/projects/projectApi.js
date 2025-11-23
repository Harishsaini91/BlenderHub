import axios from "axios";

const API_BASE =
  process.env.REACT_APP_API_URL || "http://localhost:5000";
const BASE = `${API_BASE}/api/projects`;

function authHeader(token) {
  const t =
    token ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// UPLOAD MEDIA
export const uploadProjectMedia = async (files, token) => {
  const fd = new FormData();
  files.forEach((f) => fd.append("media", f));

  return axios.post(`${BASE}/upload`, fd, {
    headers: {
      "Content-Type": "multipart/form-data",
      ...authHeader(token),
    },
  });
};

// CREATE TEAM PROJECT
export const submitTeamProject = (form, mediaFiles, token) => {
  const fd = new FormData();

  Object.entries(form).forEach(([k, v]) => {
    if (k === "members") fd.append("members", JSON.stringify(v));
    else fd.append(k, v);
  });

  mediaFiles.forEach((f) => fd.append("media", f));

  return axios.post(`${BASE}/team`, fd, {
    headers: {
      "Content-Type": "multipart/form-data",
      ...authHeader(token),
    },
  });
};

// UPDATE TEAM PROJECT
export const updateTeamProject = (id, form, mediaFiles, token) => {
  const fd = new FormData();

  Object.entries(form).forEach(([k, v]) => {
    if (k === "members") fd.append("members", JSON.stringify(v));
    else fd.append(k, v);
  });

  mediaFiles.forEach((f) => fd.append("media", f));

  return axios.put(`${BASE}/team/${id}`, fd, {
    headers: {
      "Content-Type": "multipart/form-data",
      ...authHeader(token),
    },
  });
};

// GET MY PROJECTS
export const fetchMyProjects = (token) => {
  return axios.get(`${BASE}/my-projects`, {
    headers: { ...authHeader(token) },
  });
};

export const deleteTeamProject = (id, token) => {
  return axios.delete(`${BASE}/team/${id}`, {
    headers: { ...authHeader(token) },
  });
};

export default {
  uploadProjectMedia,
  submitTeamProject,
  updateTeamProject,
  fetchMyProjects,
  deleteTeamProject
};
