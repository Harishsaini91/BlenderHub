// src/components/AITools/TextureTool.js
import React, { useState } from "react";
import "./css/TextureTool.css";

const TextureTool = () => {
  const [prompt, setPrompt] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState("realistic");
  const [resolution, setResolution] = useState("1024x1024");
  const [seamless, setSeamless] = useState(true);
  const [generatedImage, setGeneratedImage] = useState(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedImage(URL.createObjectURL(file));
    }
  };

  const handleGenerate = () => {
    // TODO: Call AI API here
    const dummyResult = "https://via.placeholder.com/512";
    setGeneratedImage(dummyResult);
  };

  const handleClear = () => {
    setPrompt("");
    setUploadedImage(null);
    setGeneratedImage(null);
  };

  return (
    <div className="texture-tool-scope">
    <div className="texture-tool-layout">
      {/* Left Panel */}
      <div className="left-panel">
        <h3>Prompt</h3>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the texture you want..."
        />

        <label className="upload-btn">
          Upload Image
          <input type="file" accept="image/*" onChange={handleImageUpload} />
        </label>

        {uploadedImage && (
          <img
            src={uploadedImage}
            alt="Uploaded"
            className="preview-img"
          />
        )}

        <div className="btn-group">
          <button onClick={handleGenerate}>Generate</button>
          <button onClick={handleClear} className="secondary">
            Clear
          </button>
        </div>
      </div>

      {/* Center Area */}
      <div className="center-area">
        <h3>Generated Texture</h3>
        {generatedImage ? (
          <img
            src={generatedImage}
            alt="Generated"
            className="generated-img"
          />
        ) : (
          <div className="placeholder">Texture will appear here</div>
        )}
      </div>

      {/* Right Panel */}
      <div className="right-panel">
        <h3>Settings</h3>

        <label>Style</label>
        <select
          value={selectedStyle}
          onChange={(e) => setSelectedStyle(e.target.value)}
        >
          <option value="realistic">Realistic</option>
          <option value="sci-fi">Sci-Fi</option>
          <option value="grunge">Grunge</option>
          <option value="wood">Wood</option>
        </select>

        <label>Resolution</label>
        <select
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
        >
          <option value="512x512">512 x 512</option>
          <option value="1024x1024">1024 x 1024</option>
          <option value="2048x2048">2048 x 2048</option>
        </select>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={seamless}
            onChange={(e) => setSeamless(e.target.checked)}
          />
          Seamless
        </label>
      </div>
    </div>
  </div>
  );
};

export default TextureTool;
