// Updated DropdownMenu.js
import React, { useRef, useEffect } from "react";

const DropdownMenu = ({ user, onLogin, onLogout, onProfile, onHelp, showRegister }) => {
    return (
        <div className="dropdown-menu bg-white shadow-md rounded absolute right-0 top-full z-50 border">
            {user ? (
                <>
                    <div onClick={onProfile}>Profile</div>
                    <div onClick={onLogout}>Logout</div>
                    <div onClick={onHelp}>Help</div>
                    <div>Other Platforms</div>
                </>
            ) : (
                <>
                    <div onClick={onLogin}>Login</div>
                    <div onClick={showRegister}>Register</div>
                    <div onClick={onHelp}>Help</div>
                    <div>Other Platforms</div>
                </>

            )}
        </div>
    );
};

export default DropdownMenu;
