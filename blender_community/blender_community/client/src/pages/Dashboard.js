// Dashboard.js — FINAL CLEAN VERSION
import React, { useState, useEffect, useRef } from "react";
import DropdownMenu from "../components/DropdownMenu";
import ProfilePage from "../components/profile/ProfilePage";
import NotificationComponent from "../components/notification/NotificationComponent";
import AITools from "../components/AITools/AIToolsLayout";
import ConnectPeople from "../components/filter_people/ConnectPeople";
import MainProjectView from "../components/project_views_submittion/UserProjects";
import Mutual_project_scroller from "../components/project_views_submittion/MutualFeed";

import { ChatProvider } from "../components/chat_and_share/chat/ChatContext";
import ChatLayout from "../components/chat_and_share/chat/ChatLayout";

import EventList from "../components/events/EventList";
import MyEventBoard from "../components/events/MyEventBoard";
import "assets/styles/pages/Dashboard.css";


const menuItems = [
  "Profile",
  "Connect People",
  "Team Request",
  "Stats",
  "Messages",
  "Notification",
  "AITools",
  "MainProjectView",
  "Mutual_project_scroller",
  "My created Events",
  "Event Board",
];

export default function Dashboard() {
  const [activeKey, setActiveKey] = useState("Profile");
  const [profileUserId, setProfileUserId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(true);

  // user state
  const [user, setUser] = useState(() => {
    try {
      const local = localStorage.getItem("user");
      const session = sessionStorage.getItem("user");
      const stored = session || local;
      if (!stored || stored === "undefined") return null;
      return JSON.parse(stored);
    } catch {
      return null;
    }
  });

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => setShowDropdown((p) => !p);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // handle messages from auth popups
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === "LOGIN_SUCCESS") {
        sessionStorage.setItem("user", JSON.stringify(event.data.payload));
        setUser(event.data.payload);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const LoginMessage = () => (
    <>
      <p>Login to connect with creators.</p>
      <p
        style={{
          padding: "15px",
          cursor: "pointer",
          fontWeight: "bold",
          color: "#ff4444",
        }}
        onClick={() =>
          window.open("/auth?mode=login", "Login", "width=400,height=500")
        }
      >
        Click here (Login)
      </p>
    </>
  );

  return (
    <div className="dashboard">
      {/* -------------------------------------------------- TOP BAR -------------------------------------------------- */}
      <div className="top-bar">
        <ul>
          <li className="logo">🌐 Blender Community</li>

          <li
            onClick={() => setActiveKey("Notification")}
            className="top-item"
          >
            🔔 Notification <span className="badge">3</span>
          </li>

          <li onClick={() => setActiveKey("AITools")} className="top-item">
            AITools
          </li>

          <li className="top-item">About</li>
          <li className="top-item">Help</li>

          {/* USER DROPDOWN */}
          <div ref={dropdownRef} className="user-dropdown-wrapper">
            <li className="user" onClick={toggleDropdown}>
              {user ? (
                <div className="profile-wrapper">
                  <div className="profile-circle">
                    {user.image ? (
                      <img
                        src={`http://localhost:5000/uploads/image/${user.image}`}
                        className="user-img"
                        alt="User"
                      />
                    ) : (
                      <span>{user.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                </div>
              ) : (
                "Login"
              )}
            </li>

            {showDropdown && (
              <DropdownMenu
                user={user}
                onProfile={() => setActiveKey("Profile")}
                onLogin={() =>
                  window.open("/auth?mode=login", "Login", "width=400,height=500")
                }
                showRegister={() =>
                  window.open(
                    "/auth?mode=register",
                    "Register",
                    "width=400,height=600"
                  )
                }
                onLogout={() => {
                  sessionStorage.clear();
                  localStorage.clear();
                  setUser(null);
                  window.location.reload();
                }}
              />
            )}
          </div>
        </ul>
      </div>

      {/* -------------------------------------------------- TOGGLE STRIP -------------------------------------------------- */}
      <div className="toggle-strip" onClick={() => {
        const newState = !menuOpen;
        setMenuOpen(newState);

        // update CSS variable so chat components / layout can react
        // adjust the widths to your preferred sizes (open=320px, closed=80px)
        document.documentElement.style.setProperty("--dashboard-right-panel-width", newState ? "240px" : "80px");
        document.documentElement.style.setProperty("--dashboard-left-panel-width", newState ? "calc(100% - 240px)" : "calc(100% - 80px)");
      }}>
        <div className="dashboard-hamburger">☰</div>
      </div>

      {/* -------------------------------------------------- MAIN AREA -------------------------------------------------- */}
      <div className="main-area">
        {/* ---------------- LEFT PANEL ---------------- */}
        <div className={`left-panel ${menuOpen ? "" : "full-width"}`}>
          {activeKey === "Profile" && <ProfilePage />}

          {activeKey === "Notification" &&
            (user ? <NotificationComponent user={user} /> : <LoginMessage />)}

          {activeKey === "Connect People" &&
            (user ? (
              profileUserId ? (
                <ProfilePage
                  userId={profileUserId}
                  setProfileUserId={setProfileUserId}
                />
              ) : (
                <ConnectPeople
                  user={user}
                  setProfileUserId={setProfileUserId}
                />
              )
            ) : (
              <LoginMessage />
            ))}

          {activeKey === "AITools" && <AITools user={user} />}

          {activeKey === "Messages" &&
            (user ? (
              <ChatProvider user={user}>
                <ChatLayout user={user} />
              </ChatProvider>
            ) : (
              <LoginMessage />
            ))}

          {activeKey === "MainProjectView" &&
            (user ? <MainProjectView user={user} /> : <LoginMessage />)}

          {activeKey === "Mutual_project_scroller" && (
            <Mutual_project_scroller user={user} />
          )}

          {activeKey === "My created Events" &&
            (user ? <MyEventBoard user={user} /> : <LoginMessage />)}

          {activeKey === "Event Board" && <EventList user={user} />}

          {activeKey === "Stats" && (
            <div>
              <h2>Stats</h2>
              <p>Show analytics here.</p>
            </div>
          )}
        </div>

        {/* ---------------- RIGHT PANEL (MENU) ---------------- */}
        <div className={`right-panel ${menuOpen ? "open" : "closed"}`}>
          <div className="menu-wrapper">
            {menuItems.map((item) => (
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
    </div>
  );
}
