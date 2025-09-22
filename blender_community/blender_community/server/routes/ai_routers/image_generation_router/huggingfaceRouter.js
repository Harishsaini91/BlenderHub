const express = require("express");
const router = express.Router();
const axiosIPv4 = require("./_ipv4Axios"); // your ipv4 helper

router.post("/", async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await axiosIPv4.post(
      "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1",
      { inputs: prompt },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      }
    );

    const contentType = response.headers["content-type"];

    if (contentType.includes("application/json")) {
      const msg = Buffer.from(response.data).toString("utf8");
      console.error("HuggingFace API Error:", msg);
      return res.status(500).json({ error: msg }); // ❌ exit early
    } else {
      const base64Image = Buffer.from(response.data).toString("base64");
      const imageUrl = `data:image/png;base64,${base64Image}`;
      console.log("Returning imageUrl (huggingface):", imageUrl.slice(0, 200) + "...");
      return res.json({ imageUrl }); // ✅ only runs on success
    }
  } catch (err) {
    console.error("HuggingFace Request Failed:", err.message);
    return res.status(500).json({ error: "HuggingFace request failed" });
  }
});

module.exports = router;
