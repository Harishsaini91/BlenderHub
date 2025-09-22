
// Dashboard.js (Complete Version)
import React, { useState, useEffect, useRef } from "react";
import './Dashboard.css';
import DropdownMenu from '../components/DropdownMenu';
import ProfilePage from '../components/profile/ProfilePage';
import NotificationComponent from '../components/notification/NotificationComponent';
import Messages from '../components/chat_and_share/ChatLayout';
import AITools from '../components/AITools/AIToolsLayout';
import ConnectPeople from '../components/filter_people/ConnectPeople';
import ChatLayout from '../components/chat_and_share/ChatLayout';
import ProjectShowcase from '../components/project_views_submittion/ProjectShowcase';








const menuItems = ["Profile", "Connect People", "Team Request", "Stats", "Messages", "Notification","AITools","ProjectShowcase"];

const Dashboard = () => {
  const [activeKey, setActiveKey] = useState("Upload");

  const [user, setUser] = useState(() => {
    try {
      const local = localStorage.getItem("user");
      const session = sessionStorage.getItem("user");

      // Ensure it is valid and not the string "undefined"
      const stored = session || local;
      if (!stored || stored === "undefined") return null;

      return JSON.parse(stored);
    } catch (err) {
      console.error("Failed to parse user data:", err);
      return null;
    }
  });


  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => setShowDropdown(prev => !prev);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === "REGISTER_SUCCESS") {
        const loginWindow = window.open("/auth?mode=login", "Login", "width=400,height=500");
        loginWindow?.postMessage({
          type: "FILL_LOGIN",
          payload: event.data.payload
        }, '*');
      }
      if (event.data?.type === "LOGIN_SUCCESS") {
        sessionStorage.setItem("user", JSON.stringify(event.data.payload));
        setUser(event.data.payload);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className="dashboard">
      {/* Top Bar */}
      <div className="top-bar">
        <ul>
          <li className="logo">🌐 Blender Community</li>
          <li onClick={() => setActiveKey("Notification")} style={{ cursor: "pointer", position: "relative" }}>
            🔔 Notification
            <span className="badge">3</span>
          </li>
          <li onClick={() => setActiveKey("AITools")} style={{ cursor: "pointer", position: "relative" }}>
            AITools
            {/* <span className="badge">3</span> */}
          </li>

          <li>About</li>
          <li>Help</li>


          <div className="user-dropdown-wrapper" ref={dropdownRef}>
            <li className="user" onClick={toggleDropdown}>
              {user ? (
                <div className="profile-wrapper">
                  <div className="profile-circle">
                    {user.image ? (
                      <img
                        src={`http://localhost:5000/uploads/image/${user.image}`} // or full URL
                        alt="User"
                        className="user-img"
                      />
                    ) : (
                      <span>{user.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="user-initial" style={{ color: 'red' }} >{user.name.charAt(0).toUpperCase()}</span>
                </div>
              ) : (
                "Login"
              )}
            </li>

            {showDropdown && (
              <DropdownMenu
                user={user}
                onLogin={() => window.open("/auth?mode=login", "Login", "width=400,height=500")}
                onLogout={() => {
                  sessionStorage.removeItem("user");
                  localStorage.removeItem("user");
                  setUser(null);
                }}
                onProfile={() => setActiveKey("Profile")}
                onHelp={() => alert("Help section")}
                showRegister={() => window.open("/auth?mode=register", "Register", "width=400,height=600")}
              />
            )}
          </div>


        </ul>
      </div>

      {/* Main Content */}
      <div className="main-area">



        <div className="left-panel">
          {activeKey === "Profile" && <ProfilePage />}
          {activeKey === "Notification" && <NotificationComponent user={user} />}
          {activeKey === "Connect People" && <ConnectPeople user={user} />}
          {activeKey === "AITools" && <AITools user={user} />}
          {activeKey === "Messages" && <Messages user={user} />}
          {activeKey === "ProjectShowcase" && <ProjectShowcase user={user} />}
          {/* {activeKey === "Team Request" && <TeamRequest user={user} />} */}
          {activeKey === "Stats" && (
            <div>
              <h2>Stats</h2>
              <p>Show stats and analytics here.</p>
            </div>
          )}
          {/* {activeKey === "Messages" && <ChatLayout />} */}
          {activeKey === "Messages" && (
            <div>
              <h2>Messages</h2>
              <p>Chat and inbox system coming soon.</p>
            </div>
          )}
        </div>
        <div className="right-panel">
          {menuItems.map(item => (
            <div
              key={item}
              className={`menu-item ${item === activeKey ? "active" : ""}`}
              onClick={() => setActiveKey(item)}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
