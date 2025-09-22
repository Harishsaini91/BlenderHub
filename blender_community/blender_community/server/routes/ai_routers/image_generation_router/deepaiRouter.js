const express = require("express");
const router = express.Router();
const axiosIPv4 = require("./_ipv4Axios");

// DeepAI docs: https://deepai.org/machine-learning-model/text2img
router.post("/", async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log("DeepAI key loaded:", process.env.DEEPAI_API_KEY?.length);

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    if (!process.env.DEEPAI_API_KEY) {
      return res.status(500).json({ error: "DeepAI API key not configured." });
    }

    const response = await axiosIPv4.post(
      "https://api.deepai.org/api/text2img",
      { text: prompt },
      { headers: { "api-key": process.env.DEEPAI_API_KEY } }
    );

    // DeepAI returns { output_url: "https://..." }
    const imageUrl = response?.data?.output_url;
    if (!imageUrl) {
      return res.status(502).json({ error: "DeepAI: No output_url returned." });
    }

    return res.json({ imageUrl });
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;

    // Bubble up 401 (bad key) etc.
    if (status) {
      return res.status(status).json({
        error: data?.error || data?.message || "DeepAI request failed."
      });
    }

    console.error("DeepAI Error:", err.message);
    return res.status(500).json({ error: "DeepAI failed" });
  }
});

module.exports = router;
