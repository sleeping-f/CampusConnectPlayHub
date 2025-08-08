// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const db = require('../config/db');

// get profile (protected)
router.get('/me', auth, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name, email, department, year, routine, free_times, is_admin FROM users WHERE id = ?', [req.user.id]);
        if (!rows.length) return res.status(404).json({ message: 'User not found' });

        const user = rows[0];
        // parse JSON fields if present
        user.routine = user.routine ? JSON.parse(user.routine) : null;
        user.free_times = user.free_times ? JSON.parse(user.free_times) : null;

        res.json({ user });
    } catch (err) {
        console.error('Get profile error', err);
        res.status(500).json({ error: err.message });
    }
});

// update free_times or routine (protected)
router.put('/me', auth, async (req, res) => {
    try {
        const { routine, free_times } = req.body;
        await db.query('UPDATE users SET routine = ?, free_times = ? WHERE id = ?', [
            routine ? JSON.stringify(routine) : null,
            free_times ? JSON.stringify(free_times) : null,
            req.user.id
        ]);
        res.json({ message: 'Profile updated' });
    } catch (err) {
        console.error('Update profile error', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
