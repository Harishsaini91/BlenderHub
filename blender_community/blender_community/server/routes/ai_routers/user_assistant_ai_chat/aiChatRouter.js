// blender_community\server\routes\ai_routers\user_assistant_ai_chat\aiChatRouter.js
const express = require("express");
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);  // 🔥 Force DNS fallback

const axios = require("axios").create({
  timeout: 25000,
  family: 4   // 🔥 Force IPv4 only
});

const router = express.Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

router.post("/openrouter/chat", async (req, res) => {
  console.log("✅ Received OpenRouter Chat POST");

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
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Blender Artist AI Assistant",
        }
      }
    );

    return res.json({
      reply: response.data?.choices?.[0]?.message?.content || "No response"
    });

  } catch (err) {
    console.error("❌ OpenRouter error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Failed to contact OpenRouter." });
  }
});

module.exports = router;
