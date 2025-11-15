import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import AuthPopup from "./components/Authpopup";
import ProfilePage from "./components/profile/ProfilePage";
import EventDashboard from "./pages/EventDashboard"; 
import EventPage from "./pages/EventPage"; 
import ProtectedRoute from "./components/auth/ProtectedRoute";
import "assets/styles/components/App.css";

import { fetchMutualSuggestions } from "./utils/fetchMutualSuggestions";

function App() {
  useEffect(() => {
    const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
    const user = stored ? JSON.parse(stored) : null;

    if (user && user._id) {
      fetchMutualSuggestions(user._id);
    }
  }, []);

  return (
    <Router>
      <Routes>

        {/* ===========================
             PUBLIC ROUTES
         ============================ */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/auth" element={<AuthPopup />} />
        {/* <Route path="/event" element={<EventDashboard />} />  */}
        {/* PUBLIC EVENT PAGE */}
<Route path="/event/:idOrLink" element={<EventPage />} />

        {/* if event is public */}

        {/* ===========================
             PROTECTED ROUTES
         ============================ */} 
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

      </Routes>
    </Router>
  );
}
 
export default App;
