const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const router = express.Router();

/* ===== JWT auth middleware (Step 1 fix) ===== */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      console.error('JWT verify error:', err.name, err.message);
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    const id = payload.id ?? payload.friendId ?? payload.sub;
    if (!id) return res.status(400).json({ message: 'Token payload missing user id' });

    req.user = { id, email: payload.email, role: payload.role };
    next();
  });
};

/* ===== Validation rules ===== */
const validateRoutine = [
  body('day').isIn(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
  body('startTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('activity').trim().isLength({ min:1, max:255 }),
  body('location').trim().isLength({ min:1, max:255 }),
  body('type').isIn(['class','study','break','activity'])
];

/* ===== Routes ===== */

// Get my routines
router.get('/', authenticateToken, async (req,res) => {
  try {
    const { day } = req.query;
    let sql = `SELECT * FROM routines WHERE student_id=?`;
    const params = [req.user.id];
    if (day) { sql += ' AND day=?'; params.push(day); }
    sql += ' ORDER BY FIELD(day,"monday","tuesday","wednesday","thursday","friday","saturday","sunday"), startTime';
    const [rows] = await req.db.execute(sql, params);
    res.json({ routines: rows });
  } catch (e) {
    console.error('GET /api/routines error:', e);
    res.status(500).json({ message: 'Failed to load routines' });
  }
});

// Get a user's routines (FriendProfile)
router.get('/user/:friendId(\\d+)', authenticateToken, async (req,res) => {
  try {
    const [rows] = await req.db.execute(
      `SELECT * FROM routines WHERE student_id=? 
       ORDER BY FIELD(day,'monday','tuesday','wednesday','thursday','friday','saturday','sunday'), startTime`,
      [req.params.friendId]
    );
    res.json({ routines: rows });
  } catch (e) {
    console.error('GET /api/routines/user error:', e);
    res.status(500).json({ message: 'Failed to load routines' });
  }
});

// Get routine by id (must belong to me)
router.get('/:id(\\d+)', authenticateToken, async (req,res) => {
  try {
    const [rows] = await req.db.execute(
      `SELECT * FROM routines WHERE id=? AND student_id=?`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json({ routine: rows[0] });
  } catch (e) {
    console.error('GET /api/routines/:id error:', e);
    res.status(500).json({ message: 'Failed to get routine' });
  }
});

// Create routine
router.post('/', authenticateToken, validateRoutine, async (req,res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message:'Validation failed', errors:errors.array() });

    const { day,startTime,endTime,activity,location,type } = req.body;

    // Conflict check
    const [conflicts] = await req.db.execute(
      `SELECT id FROM routines 
       WHERE student_id=? AND day=? AND
       ((startTime<=? AND endTime>?) OR (startTime<? AND endTime>=?) OR (startTime>=? AND endTime<=?))`,
      [req.user.id, day, startTime,startTime, endTime,endTime, startTime,endTime]
    );
    if (conflicts.length) return res.status(400).json({ message:'Time conflict' });

    const [result] = await req.db.execute(
      `INSERT INTO routines (student_id,day,startTime,endTime,activity,location,\`type\`)
       VALUES (?,?,?,?,?,?,?)`,
      [req.user.id, day,startTime,endTime,activity,location,type]
    );
    const [[created]] = await req.db.execute(`SELECT * FROM routines WHERE id=?`, [result.insertId]);
    res.status(201).json({ message:'Routine created', routine: created });
  } catch (e) {
    console.error('POST /api/routines/:id error:', e);
    res.status(500).json({ message: 'Failed to add routine' });
  }
});

// Update routine
router.put('/:id(\\d+)', authenticateToken, validateRoutine, async (req,res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message:'Validation failed', errors:errors.array() });

    const { id } = req.params;
    const { day,startTime,endTime,activity,location,type } = req.body;

    const [own] = await req.db.execute(`SELECT id FROM routines WHERE id=? AND student_id=?`, [id, req.user.id]);
    if (!own.length) return res.status(404).json({ message:'Not found' });

    await req.db.execute(
      `UPDATE routines SET day=?,startTime=?,endTime=?,activity=?,location=?,\`type\`=?,updatedAt=CURRENT_TIMESTAMP 
       WHERE id=? AND student_id=?`,
      [day,startTime,endTime,activity,location,type,id,req.user.id]
    );
    const [[updated]] = await req.db.execute(`SELECT * FROM routines WHERE id=?`, [id]);
    res.json({ message:'Routine updated', routine: updated });
  } catch (e) {
    console.error('PUT /api/routines/:id error:', e);
    res.status(500).json({ message: 'Failed to update routine' });
  }
});

// Delete routine
router.delete('/:id(\\d+)', authenticateToken, async (req,res) => {
  try {
    const [result] = await req.db.execute(
      `DELETE FROM routines WHERE id=? AND student_id=?`,
      [req.params.id, req.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message:'Not found' });
    res.json({ message:'Routine deleted' });
  } catch (e) {
    console.error('DELETE /api/routines/:id error:', e);
    res.status(500).json({ message: 'Failed to delete routine' });
  }
});

module.exports = router;