import React, { useState } from "react";
import axios from "axios";
import "assets/styles/components/ImageGenerator.css";

// Set this to "" if you added a proxy in client/package.json
// e.g. "proxy": "http://localhost:5000"
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const modelOptions = [
  { label: "Replicate - Realistic Vision", value: "replicate" },
  { label: "DeepAI - Basic Generator", value: "deepai" },
  { label: "HuggingFace - Stable Diffusion", value: "huggingface" },
];

const ImageGenerator = () => {
  const [selectedModel, setSelectedModel] = useState("replicate");
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleGenerate = async () => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;

    setLoading(true);
    setImageUrl("");
    setErrorMsg("");

    // try {
    //   const res = await axios.post(
    //     `${API_BASE}/api/image/${selectedModel}`,
    //     { prompt: cleanPrompt }
    //   );

    //   const possibleOutputs = [res.data.imageUrl, res.data.output, res.data.url];
    //   const image = possibleOutputs.find(Boolean);
    //   if (!image) throw new Error("No image returned from API.");
    //   setImageUrl(image);
    // } catch (err) {
    //   const status = err?.response?.status;
    //   const backendMsg = err?.response?.data?.error || err.message;

    //   let friendly = "Failed to generate image.";
    //   if (status === 401) friendly = "Unauthorized: Check your API key.";
    //   else if (status === 402) friendly = "Payment required: Add credits/billing for this provider.";
    //   else if (status === 429) friendly = "Rate limited: Try again later.";
    //   else if (status === 500) friendly = "Server error: Check backend logs.";

    //   setErrorMsg(`${friendly} (${selectedModel}) — ${backendMsg}`);
    //   console.error(`❌ ${selectedModel} error:`, err);
    // } finally {
    //   setLoading(false);
    // }


    try {
  const res = await axios.post(
    `${API_BASE}/api/image/${selectedModel}`,
    { prompt: cleanPrompt }
  );

  const image = res.data.imageUrl;
  if (!image) throw new Error("No image returned from API.");
  setImageUrl(image);
} catch (err) {
  const status = err?.response?.status;
  const backendMsg = err?.response?.data?.error || err.message;

  let friendly = "Failed to generate image.";
  if (status === 401) friendly = "Unauthorized: Check your API key.";
  else if (status === 402) friendly = "Payment required: Add credits/billing for this provider.";
  else if (status === 429) friendly = "Rate limited: Try again later.";
  else if (status === 500) friendly = "Server error: Check backend logs.";

  setErrorMsg(`${friendly} (${selectedModel}) — ${backendMsg}`);
  console.error(`❌ ${selectedModel} error:`, err);
}

  };

  return (
    <div className="image-gen-container">
      <h2 className="title">🎨 AI Image Generator</h2>

      <div className="controls">
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="model-selector"
          aria-label="Select image model"
        >
          {modelOptions.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your image (e.g., a futuristic city at night)…"
          className="prompt-input"
          aria-label="Image prompt"
        />

        <button onClick={handleGenerate} disabled={loading} className="generate-btn">
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>

      {errorMsg && (
        <div className="error-banner" role="alert" style={{ marginTop: 12 }}>
          {errorMsg}
        </div>
      )}

      {imageUrl && (
        <div className="image-preview">
          <img src={imageUrl} alt="AI Generated" />
        </div>
      )}

      <pre style={{ maxWidth: 400, overflow: "auto", whiteSpace: "wrap" }}>
  {imageUrl.slice(0, 200)}...
</pre>

    </div>
  );
};

export default ImageGenerator;
