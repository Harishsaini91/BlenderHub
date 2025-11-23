// client/src/components/events/participant_form_type/EventModeSelection.js
import React from "react";
import "./participation_modal.css";

const EventModeSelection = ({ onSelect, onClose }) => {
  return (
    <div className="participation-modal-overlay">
      <div className="participation-modal">
        <h2>Select Participation Type</h2>

        <div className="mode-options">
          <button className="mode-btn" onClick={() => onSelect("solo")}>
            Join as Solo
          </button>

          <button className="mode-btn" onClick={() => onSelect("team")}>
            Join as Team
          </button>
        </div>

        <button className="close-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default EventModeSelection;
