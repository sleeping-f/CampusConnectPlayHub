const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

// Lightweight auth
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

// Submit bug (JWT -> user_id)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, severity } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: "Title and description are required" });
    }

    await req.db.execute(
      `INSERT INTO bug_reports (user_id, title, description, severity, status, created_at)
       VALUES (?, ?, ?, ?, 'open', NOW())`,
      [userId, title, description, severity || "medium"]
    );
    res.json({ success: true, message: "Bug report submitted successfully!" });
  } catch (err) {
    console.error("❌ Bug report error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// List bugs
router.get("/", authenticateToken, async (req, res) => {
  try {
    const [rows] = await req.db.execute(
      `SELECT b.id, b.user_id, b.title, b.description, b.severity, b.status, b.created_at,
              u.firstName, u.lastName, u.email
       FROM bug_reports b
       LEFT JOIN users u ON u.id = b.user_id
       ORDER BY b.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Bug fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
