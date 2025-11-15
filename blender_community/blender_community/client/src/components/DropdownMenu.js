// DropdownMenu.js (RESTORED CLEAN VERSION)
import React from "react";

const DropdownMenu = ({ user, onLogin, onLogout, onProfile, onHelp, showRegister }) => {
    return (
        <div className="dropdown-menu">
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
