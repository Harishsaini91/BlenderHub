const express = require("express");
const router = express.Router();
const axiosIPv4 = require("./_ipv4Axios");

// NOTE: Replicate often requires billing; 402 means "Payment Required".
const REPLICATE_VERSION = "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc";

router.post("/", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: "Replicate API token not configured." });
    }

    // 1) Create prediction
    const create = await axiosIPv4.post(
      "https://api.replicate.com/v1/predictions",
      {
        version: REPLICATE_VERSION,
        input: { prompt }
      },
      {
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    let result = create.data;

    // 2) Poll until done
    const MAX_POLLS = 30; // ~60s with 2s interval
    let tries = 0;
    while (!["succeeded", "failed", "canceled"].includes(result.status) && tries < MAX_POLLS) {
      await new Promise((r) => setTimeout(r, 2000));
      const check = await axiosIPv4.get(result.urls.get, {
        headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` }
      });
      result = check.data;
      tries++;
    }

    if (result.status === "succeeded") {
      // output can be string or array of urls depending on model
      const out = result.output;
      const imageUrl = Array.isArray(out) ? out[0] : out;
      if (!imageUrl) {
        return res.status(502).json({ error: "Replicate: No output URL returned." });
      }
      return res.json({ imageUrl });
    }

    if (result.status === "failed" || result.status === "canceled") {
      return res.status(502).json({ error: `Replicate ${result.status}.` });
    }

    return res.status(504).json({ error: "Replicate timed out while generating." });
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;

    // Forward meaningful statuses (e.g., 402 Payment Required)
    if (status) {
      return res.status(status).json({
        error: data?.error || data?.message || "Replicate request failed."
      });
    }

    console.error("Replicate error:", err.message);
    return res.status(500).json({ error: "Replicate image generation failed." });
  }
});

module.exports = router;
