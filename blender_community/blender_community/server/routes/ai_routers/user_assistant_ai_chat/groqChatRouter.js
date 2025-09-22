// server/routes/ai_routers/groqChatRouter.js
const express = require("express");
const axios = require("axios");
const router = express.Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY;

router.post("/groq/chat", async (req, res) => {
  const { messages, model = "llama3-70b-8192" } = req.body;

  try {
    const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
      model,
      messages,
    }, {
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    res.json(response.data);
  } catch (err) {
    console.error("❌ Groq API error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

module.exports = router;
