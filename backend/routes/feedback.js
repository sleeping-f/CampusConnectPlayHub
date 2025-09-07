const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

// Lightweight auth (keeps your users.js untouched)
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Access token required" });
  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ message: "Invalid or expired token" });
    const id = payload.id ?? payload.userId ?? payload.sub;
    if (!id) return res.status(400).json({ message: "Token payload missing user id" });
    req.user = { id, role: payload.role, email: payload.email };
    next();
  });
}

// Debug
router.get("/test", (req, res) => res.json({ message: "Feedback route is working!" }));

// Submit feedback (JWT -> user_id)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    await req.db.execute(
      "INSERT INTO feedback (user_id, message, created_at) VALUES (?, ?, NOW())",
      [userId, message]
    );
    res.json({ success: true, message: "Feedback submitted successfully!" });
  } catch (err) {
    console.error("❌ Feedback error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// List feedbacks
router.get("/", authenticateToken, async (req, res) => {
  try {
    const [rows] = await req.db.execute(
      `SELECT f.id, f.user_id, f.message, f.status, f.priority, f.created_at,
              u.firstName, u.lastName, u.email
       FROM feedback f
       LEFT JOIN users u ON u.id = f.user_id
       ORDER BY f.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Feedback fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
