const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Validation middleware
const validateRoutine = [
  body('day').isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).withMessage('Valid day is required'),
  body('startTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time is required (HH:MM)'),
  body('endTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time is required (HH:MM)'),
  body('activity').trim().isLength({ min: 1, max: 255 }).withMessage('Activity must be between 1 and 255 characters'),
  body('location').trim().isLength({ min: 1, max: 255 }).withMessage('Location must be between 1 and 255 characters'),
  body('type').isIn(['class', 'study', 'break', 'activity']).withMessage('Valid type is required')
];

// Get all routines for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { day } = req.query;
    
    let query = `
      SELECT id, day, startTime, endTime, activity, location, type, createdAt, updatedAt
      FROM routines 
      WHERE userId = ?
    `;
    const values = [req.user.userId];

    if (day) {
      query += ` AND day = ?`;
      values.push(day);
    }

    query += ` ORDER BY day, startTime`;

    const [routines] = await req.db.execute(query, values);

    res.json({ routines });

  } catch (error) {
    console.error('Get routines error:', error);
    res.status(500).json({ message: 'Failed to get routines' });
  }
});

// Get routine by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [routines] = await req.db.execute(
      `SELECT id, day, startTime, endTime, activity, location, type, createdAt, updatedAt
       FROM routines 
       WHERE id = ? AND userId = ?`,
      [id, req.user.userId]
    );

    if (routines.length === 0) {
      return res.status(404).json({ message: 'Routine not found' });
    }

    res.json({ routine: routines[0] });

  } catch (error) {
    console.error('Get routine error:', error);
    res.status(500).json({ message: 'Failed to get routine' });
  }
});

// Create new routine
router.post('/', authenticateToken, validateRoutine, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { day, startTime, endTime, activity, location, type } = req.body;

    // Check for time conflicts
    const [conflicts] = await req.db.execute(
      `SELECT id FROM routines 
       WHERE userId = ? AND day = ? AND 
       ((startTime <= ? AND endTime > ?) OR 
        (startTime < ? AND endTime >= ?) OR
        (startTime >= ? AND endTime <= ?))`,
      [req.user.userId, day, startTime, startTime, endTime, endTime, startTime, endTime]
    );

    if (conflicts.length > 0) {
      return res.status(400).json({ message: 'Time conflict with existing routine' });
    }

    // Insert new routine
    const [result] = await req.db.execute(
      `INSERT INTO routines (userId, day, startTime, endTime, activity, location, type) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.userId, day, startTime, endTime, activity, location, type]
    );

    // Get the created routine
    const [routines] = await req.db.execute(
      `SELECT id, day, startTime, endTime, activity, location, type, createdAt, updatedAt
       FROM routines WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Routine created successfully',
      routine: routines[0]
    });

  } catch (error) {
    console.error('Create routine error:', error);
    res.status(500).json({ message: 'Failed to create routine' });
  }
});

// Update routine
router.put('/:id', authenticateToken, validateRoutine, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const { day, startTime, endTime, activity, location, type } = req.body;

    // Check if routine exists and belongs to user
    const [existingRoutines] = await req.db.execute(
      'SELECT id FROM routines WHERE id = ? AND userId = ?',
      [id, req.user.userId]
    );

    if (existingRoutines.length === 0) {
      return res.status(404).json({ message: 'Routine not found' });
    }

    // Check for time conflicts (excluding current routine)
    const [conflicts] = await req.db.execute(
      `SELECT id FROM routines 
       WHERE userId = ? AND day = ? AND id != ? AND
       ((startTime <= ? AND endTime > ?) OR 
        (startTime < ? AND endTime >= ?) OR
        (startTime >= ? AND endTime <= ?))`,
      [req.user.userId, day, id, startTime, startTime, endTime, endTime, startTime, endTime]
    );

    if (conflicts.length > 0) {
      return res.status(400).json({ message: 'Time conflict with existing routine' });
    }

    // Update routine
    await req.db.execute(
      `UPDATE routines 
       SET day = ?, startTime = ?, endTime = ?, activity = ?, location = ?, type = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ? AND userId = ?`,
      [day, startTime, endTime, activity, location, type, id, req.user.userId]
    );

    // Get updated routine
    const [routines] = await req.db.execute(
      `SELECT id, day, startTime, endTime, activity, location, type, createdAt, updatedAt
       FROM routines WHERE id = ?`,
      [id]
    );

    res.json({
      message: 'Routine updated successfully',
      routine: routines[0]
    });

  } catch (error) {
    console.error('Update routine error:', error);
    res.status(500).json({ message: 'Failed to update routine' });
  }
});

// Delete routine
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await req.db.execute(
      'DELETE FROM routines WHERE id = ? AND userId = ?',
      [id, req.user.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Routine not found' });
    }

    res.json({ message: 'Routine deleted successfully' });

  } catch (error) {
    console.error('Delete routine error:', error);
    res.status(500).json({ message: 'Failed to delete routine' });
  }
});

// Get free time slots for a specific day
router.get('/free-time/:day', authenticateToken, async (req, res) => {
  try {
    const { day } = req.params;
    const { duration = 60 } = req.query; // Duration in minutes

    // Get all routines for the specified day
    const [routines] = await req.db.execute(
      `SELECT startTime, endTime FROM routines 
       WHERE userId = ? AND day = ?
       ORDER BY startTime`,
      [req.user.userId, day]
    );

    // Calculate free time slots
    const freeSlots = [];
    const dayStart = '08:00'; // 8 AM
    const dayEnd = '22:00';   // 10 PM

    let currentTime = dayStart;

    for (const routine of routines) {
      if (currentTime < routine.startTime) {
        const slotDuration = getTimeDifference(currentTime, routine.startTime);
        if (slotDuration >= duration) {
          freeSlots.push({
            startTime: currentTime,
            endTime: routine.startTime,
            duration: slotDuration
          });
        }
      }
      currentTime = routine.endTime;
    }

    // Check if there's free time after the last routine
    if (currentTime < dayEnd) {
      const slotDuration = getTimeDifference(currentTime, dayEnd);
      if (slotDuration >= duration) {
        freeSlots.push({
          startTime: currentTime,
          endTime: dayEnd,
          duration: slotDuration
        });
      }
    }

    res.json({ freeSlots });

  } catch (error) {
    console.error('Get free time error:', error);
    res.status(500).json({ message: 'Failed to get free time slots' });
  }
});

// Find routine matches with friends
router.get('/matches/friends', authenticateToken, async (req, res) => {
  try {
    const { day, type, duration = 60 } = req.query;

    if (!day) {
      return res.status(400).json({ message: 'Day parameter is required' });
    }

    // Get user's routines for the specified day
    const [userRoutines] = await req.db.execute(
      `SELECT startTime, endTime FROM routines 
       WHERE userId = ? AND day = ?`,
      [req.user.userId, day]
    );

    // Get friends' routines for the specified day
    const [friendRoutines] = await req.db.execute(
      `SELECT r.startTime, r.endTime, r.activity, r.location, r.type,
              u.id as userId, u.firstName, u.lastName, u.studentId, u.department
       FROM routines r
       JOIN users u ON r.userId = u.id
       JOIN friends f ON (f.userId = u.id OR f.friendId = u.id)
       WHERE (f.userId = ? OR f.friendId = ?) AND u.id != ? 
       AND r.day = ? AND f.status = 'accepted'`,
      [req.user.userId, req.user.userId, req.user.userId, day]
    );

    // Filter by type if specified
    const filteredRoutines = type 
      ? friendRoutines.filter(routine => routine.type === type)
      : friendRoutines;

    // Find overlapping time slots
    const matches = [];

    for (const userRoutine of userRoutines) {
      for (const friendRoutine of filteredRoutines) {
        const overlap = getTimeOverlap(userRoutine, friendRoutine);
        if (overlap && overlap.duration >= duration) {
          matches.push({
            user: {
              id: friendRoutine.userId,
              firstName: friendRoutine.firstName,
              lastName: friendRoutine.lastName,
              studentId: friendRoutine.studentId,
              department: friendRoutine.department
            },
            routine: {
              activity: friendRoutine.activity,
              location: friendRoutine.location,
              type: friendRoutine.type,
              startTime: friendRoutine.startTime,
              endTime: friendRoutine.endTime
            },
            overlap: {
              startTime: overlap.startTime,
              endTime: overlap.endTime,
              duration: overlap.duration
            }
          });
        }
      }
    }

    res.json({ matches });

  } catch (error) {
    console.error('Find matches error:', error);
    res.status(500).json({ message: 'Failed to find routine matches' });
  }
});

// Get weekly summary
router.get('/summary/weekly', authenticateToken, async (req, res) => {
  try {
    const [summary] = await req.db.execute(
      `SELECT 
        day,
        COUNT(*) as totalRoutines,
        SUM(TIMESTAMPDIFF(MINUTE, startTime, endTime)) as totalMinutes,
        GROUP_CONCAT(type) as types
       FROM routines 
       WHERE userId = ?
       GROUP BY day
       ORDER BY FIELD(day, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')`,
      [req.user.userId]
    );

    // Calculate totals
    const totalRoutines = summary.reduce((sum, day) => sum + day.totalRoutines, 0);
    const totalMinutes = summary.reduce((sum, day) => sum + (day.totalMinutes || 0), 0);

    res.json({
      summary,
      totals: {
        routines: totalRoutines,
        minutes: totalMinutes,
        hours: Math.round(totalMinutes / 60 * 10) / 10
      }
    });

  } catch (error) {
    console.error('Get weekly summary error:', error);
    res.status(500).json({ message: 'Failed to get weekly summary' });
  }
});

// Helper function to calculate time difference in minutes
function getTimeDifference(startTime, endTime) {
  const start = new Date(`2000-01-01 ${startTime}`);
  const end = new Date(`2000-01-01 ${endTime}`);
  return Math.floor((end - start) / (1000 * 60));
}

// Helper function to find time overlap
function getTimeOverlap(routine1, routine2) {
  const start1 = new Date(`2000-01-01 ${routine1.startTime}`);
  const end1 = new Date(`2000-01-01 ${routine1.endTime}`);
  const start2 = new Date(`2000-01-01 ${routine2.startTime}`);
  const end2 = new Date(`2000-01-01 ${routine2.endTime}`);

  const overlapStart = new Date(Math.max(start1, start2));
  const overlapEnd = new Date(Math.min(end1, end2));

  if (overlapStart < overlapEnd) {
    return {
      startTime: overlapStart.toTimeString().slice(0, 5),
      endTime: overlapEnd.toTimeString().slice(0, 5),
      duration: Math.floor((overlapEnd - overlapStart) / (1000 * 60))
    };
  }

  return null;
}

module.exports = router;
