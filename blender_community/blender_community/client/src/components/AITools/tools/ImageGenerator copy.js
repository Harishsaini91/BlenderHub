import React, { useState } from "react";
import axios from "axios";
import "./css/ImageGenerator.css";

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

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setImageUrl("");

    try {
      const res = await axios.post(`http://localhost:5000/api/image/${selectedModel}`, { prompt });

      // Fallback for different response structures
      const possibleOutputs = [res.data.imageUrl, res.data.output, res.data.url];
      const image = possibleOutputs.find(Boolean);
      setImageUrl(image || "");
    } catch (err) {
      console.error("❌ Image generation failed:", err.message);
      alert("Failed to generate image. Check console for details.");
    } finally {
      setLoading(false);
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
          placeholder="Describe your image (e.g. a futuristic city at night)..."
          className="prompt-input"
        />

        <button onClick={handleGenerate} disabled={loading} className="generate-btn">
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>

      {imageUrl && (
        <div className="image-preview">
          <img src={imageUrl} alt="AI Generated" />
        </div>
      )}
    </div>
  );
};

export default ImageGenerator;
