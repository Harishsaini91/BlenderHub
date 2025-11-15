// server/utils/emailService.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, // email account
    pass: process.env.SMTP_PASS, // app password or real password (use app password)
  },
});

/**
 * sendEmail({ to, subject, html, text })
 */
async function sendEmail({ to, subject, html, text }) {
  if (!transporter) throw new Error("Email transporter not configured");
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

module.exports = { sendEmail };
