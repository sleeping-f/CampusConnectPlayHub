const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get or create a direct chat room between two friends
router.post('/rooms/direct', async (req, res) => {
    try {
        const { friendId } = req.body;
        const userId = req.user.id;

        if (!friendId) {
            return res.status(400).json({ message: 'Friend ID is required' });
        }

        if (friendId === userId) {
            return res.status(400).json({ message: 'Cannot chat with yourself' });
        }

        // Check if users are friends
        const [friendship] = await req.db.execute(`
      SELECT * FROM friends 
      WHERE ((student_id_1 = ? AND student_id_2 = ?) OR (student_id_1 = ? AND student_id_2 = ?))
      AND status = 'accepted'
    `, [userId, friendId, friendId, userId]);

        if (friendship.length === 0) {
            return res.status(403).json({ message: 'You can only chat with your friends' });
        }

        // Check if direct chat room already exists
        const [existingRoom] = await req.db.execute(`
      SELECT cr.* FROM chat_rooms cr
      INNER JOIN chat_room_participants crp1 ON cr.id = crp1.room_id
      INNER JOIN chat_room_participants crp2 ON cr.id = crp2.room_id
      WHERE cr.type = 'direct' 
      AND crp1.user_id = ? AND crp2.user_id = ?
      AND crp1.user_id != crp2.user_id
    `, [userId, friendId]);

        let roomId;
        if (existingRoom.length > 0) {
            roomId = existingRoom[0].id;
        } else {
            // Create new direct chat room
            const [result] = await req.db.execute(`
        INSERT INTO chat_rooms (type, created_by) VALUES ('direct', ?)
      `, [userId]);
            roomId = result.insertId;

            // Add both users as participants
            await req.db.execute(`
        INSERT INTO chat_room_participants (room_id, user_id) VALUES (?, ?), (?, ?)
      `, [roomId, userId, roomId, friendId]);
        }

        // Get room details with participants
        const [roomDetails] = await req.db.execute(`
      SELECT cr.*, 
             u1.id as user1_id, u1.firstName as user1_firstName, u1.lastName as user1_lastName, u1.profileImage as user1_profileImage,
             u2.id as user2_id, u2.firstName as user2_firstName, u2.lastName as user2_lastName, u2.profileImage as user2_profileImage
      FROM chat_rooms cr
      INNER JOIN chat_room_participants crp1 ON cr.id = crp1.room_id
      INNER JOIN chat_room_participants crp2 ON cr.id = crp2.room_id
      INNER JOIN users u1 ON crp1.user_id = u1.id
      INNER JOIN users u2 ON crp2.user_id = u2.id
      WHERE cr.id = ? AND crp1.user_id != crp2.user_id
    `, [roomId]);

        if (roomDetails.length === 0) {
            return res.status(404).json({ message: 'Room not found' });
        }

        const room = roomDetails[0];
        const otherUser = room.user1_id === userId ? {
            id: room.user2_id,
            firstName: room.user2_firstName,
            lastName: room.user2_lastName,
            profileImage: room.user2_profileImage
        } : {
            id: room.user1_id,
            firstName: room.user1_firstName,
            lastName: room.user1_lastName,
            profileImage: room.user1_profileImage
        };

        res.json({
            id: room.id,
            type: room.type,
            otherUser,
            createdAt: room.created_at,
            updatedAt: room.updated_at
        });

    } catch (error) {
        console.error('Error creating/getting direct chat room:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get all chat rooms for a user
router.get('/rooms', async (req, res) => {
    try {
        const userId = req.user.id;

        const [rooms] = await req.db.execute(`
      SELECT cr.*, 
             CASE 
               WHEN cr.type = 'direct' THEN CONCAT(other.firstName, ' ', other.lastName)
               ELSE cr.room_name
             END as display_name,
             CASE 
               WHEN cr.type = 'direct' THEN other.profileImage
               ELSE NULL
             END as display_image,
             other.id as other_user_id,
             other.firstName as other_firstName,
             other.lastName as other_lastName,
             other.profileImage as other_profileImage,
             cm.message as last_message,
             cm.created_at as last_message_time,
             cm.sender_id as last_message_sender_id,
             sender.firstName as last_message_sender_name,
             (SELECT COUNT(*) FROM chat_messages cm2 
              WHERE cm2.room_id = cr.id 
              AND cm2.created_at > crp.last_read_at 
              AND cm2.sender_id != ?) as unread_count
      FROM chat_rooms cr
      INNER JOIN chat_room_participants crp ON cr.id = crp.room_id
      LEFT JOIN chat_room_participants other_crp ON cr.id = other_crp.room_id AND other_crp.user_id != ?
      LEFT JOIN users other ON other_crp.user_id = other.id
      LEFT JOIN chat_messages cm ON cr.id = cm.room_id
      LEFT JOIN users sender ON cm.sender_id = sender.id
      WHERE crp.user_id = ?
      AND (cm.id IS NULL OR cm.id = (
        SELECT MAX(id) FROM chat_messages cm3 WHERE cm3.room_id = cr.id
      ))
      ORDER BY COALESCE(cm.created_at, cr.updated_at) DESC
    `, [userId, userId, userId]);

        res.json(rooms);

    } catch (error) {
        console.error('Error fetching chat rooms:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get messages for a specific room
router.get('/rooms/:roomId/messages', async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user.id;
        const { page = 1, limit = 50 } = req.query;

        // Check if user is participant of this room
        const [participant] = await req.db.execute(`
      SELECT * FROM chat_room_participants WHERE room_id = ? AND user_id = ?
    `, [roomId, userId]);

        if (participant.length === 0) {
            return res.status(403).json({ message: 'Access denied to this chat room' });
        }

        const offset = (page - 1) * limit;

        const [messages] = await req.db.execute(`
      SELECT cm.*, 
             u.firstName, u.lastName, u.profileImage,
             reply_to.message as reply_to_message,
             reply_to_sender.firstName as reply_to_sender_name
      FROM chat_messages cm
      INNER JOIN users u ON cm.sender_id = u.id
      LEFT JOIN chat_messages reply_to ON cm.reply_to_id = reply_to.id
      LEFT JOIN users reply_to_sender ON reply_to.sender_id = reply_to_sender.id
      WHERE cm.room_id = ? AND cm.is_deleted = FALSE
      ORDER BY cm.created_at DESC
      LIMIT ? OFFSET ?
    `, [roomId, parseInt(limit), offset]);

        // Mark messages as read
        await req.db.execute(`
      UPDATE chat_room_participants 
      SET last_read_at = NOW() 
      WHERE room_id = ? AND user_id = ?
    `, [roomId, userId]);

        res.json(messages.reverse()); // Return in chronological order

    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Send a message
router.post('/rooms/:roomId/messages', async (req, res) => {
    try {
        const { roomId } = req.params;
        const { message, messageType = 'text', replyToId } = req.body;
        const userId = req.user.id;

        if (!message || message.trim() === '') {
            return res.status(400).json({ message: 'Message content is required' });
        }

        // Check if user is participant of this room
        const [participant] = await req.db.execute(`
      SELECT * FROM chat_room_participants WHERE room_id = ? AND user_id = ?
    `, [roomId, userId]);

        if (participant.length === 0) {
            return res.status(403).json({ message: 'Access denied to this chat room' });
        }

        // Insert message
        const [result] = await req.db.execute(`
      INSERT INTO chat_messages (room_id, sender_id, message, message_type, reply_to_id)
      VALUES (?, ?, ?, ?, ?)
    `, [roomId, userId, message.trim(), messageType, replyToId || null]);

        // Update room's updated_at timestamp
        await req.db.execute(`
      UPDATE chat_rooms SET updated_at = NOW() WHERE id = ?
    `, [roomId]);

        // Get the created message with sender details
        const [newMessage] = await req.db.execute(`
      SELECT cm.*, 
             u.firstName, u.lastName, u.profileImage,
             reply_to.message as reply_to_message,
             reply_to_sender.firstName as reply_to_sender_name
      FROM chat_messages cm
      INNER JOIN users u ON cm.sender_id = u.id
      LEFT JOIN chat_messages reply_to ON cm.reply_to_id = reply_to.id
      LEFT JOIN users reply_to_sender ON reply_to.sender_id = reply_to_sender.id
      WHERE cm.id = ?
    `, [result.insertId]);

        res.status(201).json(newMessage[0]);

    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get friends list for chat
router.get('/friends', async (req, res) => {
    try {
        const userId = req.user.id;

        const [friends] = await req.db.execute(`
      SELECT u.id, u.firstName, u.lastName, u.profileImage,
             CASE 
               WHEN f.student_id_1 = ? THEN f.student_id_2
               ELSE f.student_id_1
             END as friend_id
      FROM friends f
      INNER JOIN users u ON (
        CASE 
          WHEN f.student_id_1 = ? THEN f.student_id_2
          ELSE f.student_id_1
        END
      ) = u.id
      WHERE (f.student_id_1 = ? OR f.student_id_2 = ?)
      AND f.status = 'accepted'
      ORDER BY u.firstName, u.lastName
    `, [userId, userId, userId, userId]);

        res.json(friends);

    } catch (error) {
        console.error('Error fetching friends for chat:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Search friends
router.get('/friends/search', async (req, res) => {
    try {
        const userId = req.user.id;
        const { q } = req.query;

        if (!q || q.trim() === '') {
            return res.json([]);
        }

        const searchTerm = `%${q.trim()}%`;

        const [friends] = await req.db.execute(`
      SELECT u.id, u.firstName, u.lastName, u.profileImage
      FROM friends f
      INNER JOIN users u ON (
        CASE 
          WHEN f.student_id_1 = ? THEN f.student_id_2
          ELSE f.student_id_1
        END
      ) = u.id
      WHERE (f.student_id_1 = ? OR f.student_id_2 = ?)
      AND f.status = 'accepted'
      AND (u.firstName LIKE ? OR u.lastName LIKE ? OR CONCAT(u.firstName, ' ', u.lastName) LIKE ?)
      ORDER BY u.firstName, u.lastName
      LIMIT 20
    `, [userId, userId, userId, searchTerm, searchTerm, searchTerm]);

        res.json(friends);

    } catch (error) {
        console.error('Error searching friends:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
