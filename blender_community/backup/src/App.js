import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import AuthPopup from "./components/Authpopup";
import ProfilePage from "./components/profile/ProfilePage";

function App() {
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
