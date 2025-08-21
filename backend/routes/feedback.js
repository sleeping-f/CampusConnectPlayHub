const express = require("express");
const router = express.Router();   // <-- create router FIRST ✅

// Feedback test route (debug)
router.get("/test", (req, res) => {
  res.json({ message: "✅ Feedback route is alive!" });
});

// Feedback - submit
router.post("/", async (req, res) => {
  const { studentId, message } = req.body;

  console.log("📩 Incoming feedback:", { studentId, message });

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const [result] = await req.db.execute(
      "INSERT INTO feedback (studentId, message) VALUES (?, ?)",
      [studentId || null, message]
    );

    console.log("✅ Insert result:", result);
    res.json({ success: true, message: "Feedback submitted successfully!" });
  } catch (err) {
    console.error("❌ Feedback error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// Feedback - fetch all
router.get("/", async (req, res) => {
  try {
    const [rows] = await req.db.execute(
      "SELECT * FROM feedback ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Feedback fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

