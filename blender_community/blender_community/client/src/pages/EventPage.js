import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  fetchEventById,
  participateStart,
  verifyOtp,
  saveParticipation,
  verifyEventPasskey,
} from "../components/events/eventApi";


const EventPage = () => {
  const { idOrLink } = useParams();

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

    if (now < start) {
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
    } else if (start && end && now >= start && now <= end) {
      setStatus("🟢 Live Now");
    } else {
      setStatus("🔴 Event Ended");
    }
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
      setStep(3);
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

      {/* Participation System */}
      {!submitted ? (
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
            </div>
          )}

          {step === 3 && (
            <form className="participate-form" onSubmit={submitForm}>
              <h3>Your Details</h3>
              <input placeholder="Full Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />

              <input placeholder="Phone Number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />

              <input placeholder="Portfolio / Instagram Link"
                value={form.portfolio}
                onChange={(e) => setForm({ ...form, portfolio: e.target.value })} />

              <textarea placeholder="Skills"
                value={form.skill}
                onChange={(e) => setForm({ ...form, skill: e.target.value })} />

              <button type="submit">Submit</button>
            </form>
          )}
        </div>
      ) : (
        <p className="success">🎉 Participation Submitted</p>
      )}
    </div>
  );
};

export default EventPage;
