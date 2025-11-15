import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  let user = null;

  try {
    const stored = sessionStorage.getItem("user") || localStorage.getItem("user");
    user = stored ? JSON.parse(stored) : null;
  } catch {}

  if (!user || !user._id) {
    return <Navigate to="/auth?mode=login" replace />;
  }

  return children;
}
