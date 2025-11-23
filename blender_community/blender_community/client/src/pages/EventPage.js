import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  fetchEventById,
  participateStart,
  verifyOtp,
  saveParticipation,
  verifyEventPasskey,
} from "../components/events/eventApi";

import EventParticipationWrapper from "../components/events/participant_form_type/EventParticipationWrapper";
import ParticipantList from "../components/events/participant_form_type/ParticipantList";


const EventPage = () => {
  const { idOrLink } = useParams();
  const [openParticipation, setOpenParticipation] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);  // countdown seconds
  const [canResend, setCanResend] = useState(true);   // disable button
  const [eventState, setEventState] = useState({
    eventNotStarted: false,
    eventLive: false,
    eventEnded: false,
  });

  const [event, setEvent] = useState(null);
  const [status, setStatus] = useState("");

  // -------- PRIVATE EVENT STATE --------
  const [needPass, setNeedPass] = useState(false);
  const [passkey, setPasskey] = useState("");
  const [checking, setChecking] = useState(true); // waiting for backend check

  // -------- PARTICIPATION STATES --------
  const [step, setStep] = useState(1); // 1=Email, 2=OTP, 3=Form
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    portfolio: "",
    skill: "",
  });

  const [submitted, setSubmitted] = useState(false);

  // ==============================================
  // LOAD EVENT SECURELY (first check passkey)
  // ==============================================
  useEffect(() => {
    checkAccess();
  }, [idOrLink]);

  async function checkAccess() {
    setChecking(true);

    try {
      const res = await fetchEventById(idOrLink);

      // If backend says requirePasskey → show passkey modal
      if (res.data?.requirePasskey) {
        setNeedPass(true);
      } else if (res.data?.success) {
        // Public event or owner
        setEvent(res.data.event);
        updateStatus(res.data.event);
      }
    } catch (err) {
      console.error("Event load error:", err);
    }

    setChecking(false);
  }

  // ==============================================
  // VERIFY PASSKEY
  // ==============================================
  async function handleVerifyPasskey() {
    if (!passkey) return alert("Enter passkey");

    try {
      const res = await verifyEventPasskey(idOrLink, passkey);

      if (res.data.verified) {
        // Store session access
        sessionStorage.setItem(`access_${idOrLink}`, "true");

        // Load event AFTER verification
        const evRes = await fetchEventById(idOrLink, passkey);
        if (evRes.data.success) {
          setEvent(evRes.data.event);
          updateStatus(evRes.data.event);
        }

        setNeedPass(false);
      } else {
        alert("Incorrect passkey");
      }
    } catch (err) {
      console.error(err);
      alert("Verification failed");
    }
  }

  // ==============================================
  // STATUS CALCULATION
  // ==============================================
  function updateStatus(ev) {
    const now = new Date();
    const start = new Date(ev.startTime);
    const end = ev.endTime ? new Date(ev.endTime) : null;

    let eventNotStarted = now < start;
    let eventLive = end && now >= start && now <= end;
    let eventEnded = end && now > end;

    // SET STATUS TEXT
    if (eventNotStarted) {
      const diff = start - now;
      const mins = Math.floor(diff / 60000);
      const hours = Math.floor(mins / 60);
      const days = Math.floor(hours / 24);

      const m = mins % 60;
      const h = hours % 24;

      let str = "";
      if (days > 0) str += `${days}d `;
      if (h > 0) str += `${h}h `;
      if (m > 0) str += `${m}m`;

      setStatus(`⏳ Upcoming • ${str}`);
    } else if (eventLive) {
      setStatus("🟢 Live Now");
    } else {
      setStatus("🔴 Event Ended");
    }

    // SAVE STATE FOR UI
    setEventState({ eventNotStarted, eventLive, eventEnded });
  }



  // ==============================================
  // PARTICIPATION (OTP + FORM)
  // ==============================================
  async function sendOtp() {
    if (!email) return alert("Enter email");
    const res = await participateStart(event._id, { email });

    if (res.data.success) {
      alert("OTP sent!");
      setStep(2);


      // Start Countdown
      setCanResend(false);
      setResendTimer(30); // 30 seconds

      const interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      alert(res.data.message);
    }
  }

  async function confirmOtp() {
    const res = await verifyOtp(event._id, { email, otp });

    if (res.data.success) {

      if (res.data.participant) {
        const p = res.data.participant;
        setForm({
          name: p.name || "",
          phone: p.phone || "",
          portfolio: p.portfolio || "",
          skill: p.skill || "",
        });
      }

      // Open Solo/Team UI
      setOpenParticipation(true);

    } else {
      alert(res.data.message);
    }

  }

  async function submitForm(e) {
    e.preventDefault();
    const res = await saveParticipation(event._id, { email, ...form });

    if (res.data.success) {
      setSubmitted(true);
    } else {
      alert(res.data.message);
    }
  }

  // ==============================================
  // UI RENDERING
  // ==============================================
  if (checking) return <p>Loading...</p>;

  // 🔐 SHOW PASSKEY POPUP IF PRIVATE
  if (needPass) {
    return (
      <div className="passkey-screen">
        <h2>🔒 Private Event</h2>
        <p>Enter passkey to continue</p>

        <input
          value={passkey}
          onChange={(e) => setPasskey(e.target.value)}
          placeholder="Enter Passkey"
        />

        <button onClick={handleVerifyPasskey}>Verify</button>
      </div>
    );
  }

  // If event still not loaded
  if (!event) return <p>Loading event...</p>;

  // ----------- MAIN EVENT PAGE -------------
  return (
    <div className="event-page-main">

      <h1>{event.name}</h1>
      <p className="event-status">{status}</p>


      {/* NEW: event mode indicator */}
      <p className="event-mode">
        Participation Type: <b>
          {event.eventMode === "solo" && "Solo Only"}
          {event.eventMode === "team" && "Team Only"}
          {event.eventMode === "both" && "Solo or Team"}
        </b>
      </p>


      <div className="event-host">Hosted by: <b>{event.username}</b></div>

      <p className="muted">
        👥 Participants: <b>{event.participants?.length || 0}</b>
      </p>

      <div className="event-media">
        {event.media?.map((m, i) =>
          m.type === "video"
            ? <video key={i} src={m.url} controls />
            : <img key={i} src={m.url} alt="" />
        )}
      </div>

      <p className="event-description">{event.description}</p>
      {/* EVENT PHASE RENDERING — UPCOMING / LIVE / ENDED */}

      {eventState.eventNotStarted && (
        <div className="phase-box upcoming">
          <button className="start-btn" onClick={() => setStep(1)}>
            Start Participation
          </button>
        </div>
      )}

      {eventState.eventLive && (
        <div className="phase-box live">
          <p className="live-banner">🟢 Event is Live — Participation Closed</p>
        </div>
      )}

      {eventState.eventEnded && (
        <div className="phase-box ended">
          <h3>🏆 Participants</h3>
          <ParticipantList participants={event.participants} />
        </div>
      )}


      {/* BEFORE EVENT START — allow registration */}
      {eventState.eventNotStarted && !submitted && (
        <div className="participation-box">

          {step === 1 && (
            <div className="participate-step">
              <h3>Start Participation</h3>
              <input placeholder="Enter Email" value={email}
                onChange={(e) => setEmail(e.target.value)} />
              <button onClick={sendOtp}>Next</button>
            </div>
          )}

          {step === 2 && (
            <div className="participate-step">
              <h3>Verify OTP</h3>
              <input placeholder="Enter OTP" value={otp}
                onChange={(e) => setOtp(e.target.value)} />
              <button onClick={confirmOtp}>Verify</button>

              <div className="resend-box">
                {canResend ? (
                  <button onClick={sendOtp} className="resend-btn">
                    Resend OTP
                  </button>
                ) : (
                  <p className="countdown">
                    Resend OTP in <b>{resendTimer}s</b>
                  </p>
                )}
              </div>
            </div>
          )}

        </div>
      )}
      :{submitted && (
        <p className="success">🎉 Participation Submitted</p>
      )}



      {openParticipation && (
        <EventParticipationWrapper
          event={event}
          user={{ email }}     // email used in solo/team forms
          onClose={() => setOpenParticipation(false)}
        />
      )}



      {eventState.eventEnded && (
        <div className="participants-section">

          <h2>Participants & Results</h2>

          {event.participants?.length === 0 && (
            <p>No participants registered.</p>
          )}

          {event.participants?.length > 0 && (
            <>
              {/* WINNERS FIRST */}
              <h3>🏆 Winners</h3>
              <div className="winner-list">
                {event.participants
                  .filter(p => p.position)      // position = {1,2,3}
                  .sort((a, b) => a.position - b.position)
                  .map((p) => (
                    <div className="winner-card" key={p._id}>
                      <img
                        src={p.image}
                        alt=""
                        className="winner-img"
                        onClick={() => window.location.href = `/profile/${p.userId}`}
                      />
                      <h4>{p.name}</h4>
                      <p>Position: #{p.position}</p>
                      <p className="team">
                        {p.teamName || "Solo Participant"}
                      </p>
                      {p.github && (
                        <a href={p.github} target="_blank" rel="noreferrer">
                          GitHub ↗
                        </a>
                      )}
                    </div>
                  ))}
              </div>

              {/* ALL PARTICIPANTS */}
              <h3 style={{ marginTop: 24 }}>All Participants</h3>
              <div className="participant-list">
                {event.participants.map((p) => (
                  <div className="participant-card" key={p._id}>
                    <img
                      src={p.image}
                      alt=""
                      onClick={() => window.location.href = `/profile/${p.userId}`}
                    />

                    <div>
                      <h4>{p.name}</h4>
                      <p>{p.teamName || "Solo Participant"}</p>
                      {p.github && (
                        <a href={p.github} target="_blank" rel="noreferrer">
                          GitHub ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      )}



    </div>
  );
};

export default EventPage;
