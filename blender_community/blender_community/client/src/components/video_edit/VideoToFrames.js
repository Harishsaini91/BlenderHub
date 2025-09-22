import React, { useState } from "react";

const VideoToFrames = () => {
  const [video, setVideo] = useState(null);
  const [fps, setFps] = useState(1);
  const [status, setStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!video) {
      alert("Please select a video file!");
      return;
    }

    const formData = new FormData();
    formData.append("video", video);
    formData.append("fps", fps);

    setStatus("⏳ Processing video, please wait...");

    try {
      const response = await fetch("http://localhost:5000/api/video/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Server error: " + response.statusText);
      }

      // Convert response (zip) to blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "frames.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();

      setStatus("✅ Frames extracted successfully!");
    } catch (err) {
      console.error(err);
      setStatus("❌ Error: " + err.message);
    }
  };

  return (
    <div style={styles.container}>
      <h2>🎞 Video → Frames Extractor</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setVideo(e.target.files[0])}
          style={styles.input}
          required
        />
        <input
          type="number"
          value={fps}
          onChange={(e) => setFps(e.target.value)}
          placeholder="FPS (e.g. 1)"
          min="1"
          style={styles.input}
          required
        />
        <button type="submit" style={styles.button}>
          Extract Frames
        </button>
      </form>
      <p style={styles.status}>{status}</p>
    </div>
  );
};

// Inline CSS styles
const styles = {
  container: {
    maxWidth: "500px",
    margin: "40px auto",
    padding: "20px",
    background: "white",
    borderRadius: "10px",
    boxShadow: "0 3px 8px rgba(0,0,0,0.2)",
    textAlign: "center",
    fontFamily: "Arial, sans-serif",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  input: {
    padding: "10px",
    fontSize: "16px",
  },
  button: {
    padding: "12px",
    fontSize: "16px",
    background: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  status: {
    marginTop: "15px",
    fontWeight: "bold",
  },
};

export default VideoToFrames;
