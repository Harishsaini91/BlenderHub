const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const router = express.Router();
const upload = require('../middleware/upload');


// POST /api/register
router.post('/register', upload.single('image'), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const imagePath = req.file?.filename;

    if (!name || !email || !password || !imagePath) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // 🔒 Hash password
    // const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password,
      // password: hashedPassword,
      image: imagePath,
    });

    await newUser.save();

    console.log("✅ User saved:", newUser);
    res.json({ success: true, user: newUser });
  } catch (err) {
    console.error("Error saving to DB:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/login
router.post("/login", async (req, res) => {
    
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

console.log(password, user.password);


    // const valid = await bcrypt.compare(password, user.password);
    // if (!valid) return res.status(401).json({ message: "Invalid credentials" });
    if( password != user.password ){

       return res.status(401).json({ message: "Invalid credentials" });
    }

    // Send session-safe data
    // const { name, image, _id, } = user;
    // res.status(200).json({ user: { _id, name, email, image } });
    res.status(200).json({ user: user});
});

// Assuming this is inside a route/controller file

// router.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ error: "User not found" });

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(401).json({ error: "Invalid password" });

//     // Convert to plain object and remove password
//     const userData = user.toObject();
//     delete userData.password;

//     // ✅ Return all user data
//     res.json({ user: userData });
//   } catch (err) {
//     console.error("Login error:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// };

 


router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ message: "Session destroyed" });
  });
});

module.exports = router;  
 