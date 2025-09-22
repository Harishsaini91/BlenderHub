const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const router = express.Router();
const upload = multer({ dest: "uploads/videoedit" });

// POST /api/video/upload
router.post("/upload", upload.single("video"), (req, res) => {
  const fps = req.body.fps || 1; // default 1 fps
  const videoPath = req.file.path;
  const outputDir = path.join(__dirname, "../frames_" + Date.now());
  fs.mkdirSync(outputDir);

  // Extract frames using FFmpeg
  ffmpeg(videoPath)
    .output(path.join(outputDir, "frame_%04d.png"))
    .outputOptions([`-vf fps=${fps}`])
    .on("end", () => {
      // Zip the frames
      const zipPath = outputDir + ".zip";
      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", () => {
        // Send zip file to client
        res.download(zipPath, "frames.zip", () => {
          // cleanup
          fs.rmSync(videoPath, { force: true });
          fs.rmSync(outputDir, { recursive: true, force: true });
          fs.rmSync(zipPath, { force: true });
        });
      });

      archive.pipe(output);
      archive.directory(outputDir, false);
      archive.finalize();
    })
    .on("error", (err) => {
      console.error("❌ FFmpeg error:", err);
      res.status(500).send("Error processing video");
    })
    .run();
});

module.exports = router;
