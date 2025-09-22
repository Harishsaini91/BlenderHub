import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import AuthPopup from "./components/Authpopup";
import ProfilePage from "./components/profile/ProfilePage";
import { fetchMutualSuggestions } from "./utils/fetchMutualSuggestions"; // ⬅️ Make sure this path is correct

function App() {
  useEffect(() => {
    const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
    const user = stored ? JSON.parse(stored) : null;

    if (user && user._id) {
      fetchMutualSuggestions(user._id); // ✅ Runs on load if needed (every 12 hrs)
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/auth" element={<AuthPopup />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </Router>
  );
}

export default App;
