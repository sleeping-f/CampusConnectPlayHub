const bcrypt = require('bcryptjs');
const db = require('../config/db');



// 📌 REGISTER FUNCTION
exports.register = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Check if user already exists
        const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash the password
        const hash = await bcrypt.hash(password, 10);

        // Insert user into DB
        await db.query(
            'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
            [name, email, hash]
        );

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error('Register Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// 📌 LOGIN FUNCTION
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user exists
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const user = rows[0];

        // Compare password with hashed password
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // Successful login
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                is_admin: user.is_admin
            }
        });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: err.message });
    }
};
