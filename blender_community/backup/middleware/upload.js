 

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Helper to choose folder based on fieldname
const getUploadFolder = (fieldname) => {
  switch (fieldname) {
    case 'banner':
      return 'uploads/banner';
    case 'media':
      return 'uploads/media';
    case 'image':
      return 'uploads/image';
    case 'file':
      return 'uploads/chat_files';
    default:
      return 'uploads/other'; // fallback folder
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = getUploadFolder(file.fieldname);
    fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname)); // e.g., 1695000000000-12345678.png
  }
});

// Allow images and videos only
const fileFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg', 'image/png', 'image/jpg',
    'video/mp4', 'video/webm'
  ];
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Unsupported file type"), false);
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
