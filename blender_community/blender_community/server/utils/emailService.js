// server/utils/emailService.js
const nodemailer = require("nodemailer");

/* =====================================================
   BASE TRANSPORTER  (already correct)
===================================================== */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/* =====================================================
   BASIC SEND EMAIL  (you already had this)
===================================================== */
async function sendEmail({ to, subject, html, text }) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      text,
    });
    return info;
  } catch (err) {
    console.error("Email send failed:", err);
    throw err;
  }
}

/* =====================================================
   1. SOLO PARTICIPATION CONFIRMATION (Event)
===================================================== */
async function sendParticipationConfirmation({ to, eventName }) {
  const subject = `Successfully Registered for ${eventName}`;
  const html = `
    <h2>Participation Confirmed 🎉</h2>
    <p>You have successfully submitted your participation for:</p>
    <h3>${eventName}</h3>
    <p>We wish you the best of luck!</p>
  `;

  return sendEmail({ to, subject, html });
}

/* =====================================================
   2. TEAM PARTICIPATION INVITE (Event)
===================================================== */
async function sendTeamInvitation({ to, eventName, teamName, invitedBy }) {
  const subject = `You're invited to join Team "${teamName}"`;
  const html = `
    <h2>Team Invitation</h2>
    <p>You have been invited by <strong>${invitedBy}</strong> to join:</p>
    <h3>${teamName} — ${eventName}</h3>
    <p>Please check your dashboard to accept or decline.</p>
  `;

  return sendEmail({ to, subject, html });
}

/* =====================================================
   3. LONG-TERM SOLO PROJECT CREATION CONFIRMATION
===================================================== */
async function sendSoloProjectCreated({ to, projectTitle }) {
  const subject = `Your project "${projectTitle}" is created successfully`;
  const html = `
    <h2>Project Created</h2>
    <p>Your solo long-term project has been created:</p>
    <h3>${projectTitle}</h3>
    <p>You can continue to update it anytime.</p>
  `;

  return sendEmail({ to, subject, html });
}

/* =====================================================
   4. LONG-TERM TEAM PROJECT MEMBER INVITE
===================================================== */
async function sendTeamProjectInvite({ to, teamName, invitedBy }) {
  const subject = `You have been added to Team: ${teamName}`;
  const html = `
    <h2>Team Project Invitation</h2>
    <p>You were added to a long-term project team by <strong>${invitedBy}</strong>:</p>
    <h3>${teamName}</h3>
    <p>Open the app to view your role and team workspace.</p>
  `;

  return sendEmail({ to, subject, html });
}

/* =====================================================
   5. GENERAL NOTIFICATION EMAIL (Reusable)
===================================================== */
async function sendSystemNotificationEmail({ to, title, message }) {
  const subject = title;
  const html = `
    <h2>${title}</h2>
    <p>${message}</p>
  `;

  return sendEmail({ to, subject, html });
}

/* =====================================================
   EXPORT ALL FUNCTIONS
===================================================== */
module.exports = {
  sendEmail,
  sendParticipationConfirmation,
  sendTeamInvitation,
  sendSoloProjectCreated,
  sendTeamProjectInvite,
  sendSystemNotificationEmail,
};
