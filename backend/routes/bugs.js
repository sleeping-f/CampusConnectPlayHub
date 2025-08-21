const express = require("express");
const router = express.Router();

// ✅ Submit a bug report
router.post("/", async (req, res) => {
  const { studentId, title, description, severity } = req.body;

  console.log("🐞 Incoming bug report:", { studentId, title, description, severity });

  if (!title || !description) {
    return res.status(400).json({ error: "Title and description are required" });
  }

  try {
    const [result] = await req.db.execute(
      `INSERT INTO bugs (studentId, title, description, severity) VALUES (?, ?, ?, ?)`,
      [studentId || null, title, description, severity || "medium"]
    );

    res.json({ success: true, message: "Bug report submitted successfully!" });
  } catch (err) {
    console.error("❌ Bug report error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// ✅ Fetch all bug reports
router.get("/", async (req, res) => {
  try {
    const [rows] = await req.db.execute(
      "SELECT * FROM bugs ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Bug fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
