
// blender_community\blender_community\server\routes\ai_routers\user_assistant_ai_chat\aiChatRouter.js
const express = require("express");
const axios = require("axios");
const router = express.Router();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// POST /api/openrouter/chat
router.post("/openrouter/chat", async (req, res) => {
    console.log("✅ Received OpenRouter Chat POST");
    console.log(OPENROUTER_API_KEY);
    
  const { prompt, model = "mistralai/mistral-7b-instruct" } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt text" });
  }

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model,
        messages: [
          { role: "system", content: "You are a helpful assistant for artists and Blender creators." },
          { role: "user", content: prompt }
        ]
      },
      {
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000", // or your site URL
          "X-Title": "Blender Artist AI Assistant"
        }
      }
    );

    const aiMessage = response.data.choices?.[0]?.message?.content;
    res.json({ reply: aiMessage || "No response from AI" });
  } catch (err) {
    console.error("❌ OpenRouter error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to get response from OpenRouter" });
  }
});

module.exports = router;
