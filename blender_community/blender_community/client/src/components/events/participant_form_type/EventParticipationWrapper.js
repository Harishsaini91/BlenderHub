// client/src/components/events/participant_form_type/EventParticipationWrapper.js
import React, { useState } from "react";
import EventSoloParticipation from "./EventSoloParticipation";
import EventTeamParticipation from "./EventTeamParticipation";
import EventModeSelection from "./EventModeSelection";
import "./participation_modal.css";

const EventParticipationWrapper = ({ event, user, onClose }) => {
  const [selectedMode, setSelectedMode] = useState(null);

  // Auto-detect modes
  const mode = event?.eventMode;

  if (!mode) return null;

  // Direct mode — no choice needed
  if (mode === "solo")
    return (
      <EventSoloParticipation
        event={event}
        user={user}
        onClose={onClose}
      />
    );

  if (mode === "team")
    return (
      <EventTeamParticipation
        event={event}
        user={user}
        onClose={onClose}
      />
    );

  // If eventMode = "both" → show selection screen first
  if (!selectedMode)
    return (
      <EventModeSelection
        onSelect={(opt) => setSelectedMode(opt)}
        onClose={onClose}
      />
    );

  // Load based on user choice
  if (selectedMode === "solo")
    return (
      <EventSoloParticipation
        event={event}
        user={user}
        onClose={onClose}
      />
    );

  if (selectedMode === "team")
    return (
      <EventTeamParticipation
        event={event}
        user={user}
        onClose={onClose}
      />
    );

  return null;
};

export default EventParticipationWrapper;
