const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const sampleUsers = [
    {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@university.edu',
        password: 'password123',
        studentId: 'STU001',
        department: 'Computer Science',
        role: 'student'
    },
    {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@university.edu',
        password: 'password123',
        studentId: 'STU002',
        department: 'Computer Science',
        role: 'student'
    },
    {
        firstName: 'Mike',
        lastName: 'Johnson',
        email: 'mike.johnson@university.edu',
        password: 'password123',
        studentId: 'STU003',
        department: 'Mathematics',
        role: 'student'
    },
    {
        firstName: 'Sarah',
        lastName: 'Williams',
        email: 'sarah.williams@university.edu',
        password: 'password123',
        studentId: 'STU004',
        department: 'Physics',
        role: 'student'
    },
    {
        firstName: 'David',
        lastName: 'Brown',
        email: 'david.brown@university.edu',
        password: 'password123',
        studentId: 'STU005',
        department: 'Computer Science',
        role: 'student'
    },
    {
        firstName: 'Emily',
        lastName: 'Davis',
        email: 'emily.davis@university.edu',
        password: 'password123',
        studentId: 'STU006',
        department: 'Biology',
        role: 'student'
    },
    {
        firstName: 'Alex',
        lastName: 'Wilson',
        email: 'alex.wilson@university.edu',
        password: 'password123',
        studentId: 'STU007',
        department: 'Chemistry',
        role: 'student'
    },
    {
        firstName: 'Lisa',
        lastName: 'Anderson',
        email: 'lisa.anderson@university.edu',
        password: 'password123',
        studentId: 'STU008',
        department: 'Computer Science',
        role: 'student'
    },
    {
        firstName: 'Tom',
        lastName: 'Taylor',
        email: 'tom.taylor@university.edu',
        password: 'password123',
        studentId: 'STU009',
        department: 'Engineering',
        role: 'student'
    },
    {
        firstName: 'Rachel',
        lastName: 'Martinez',
        email: 'rachel.martinez@university.edu',
        password: 'password123',
        studentId: 'STU010',
        department: 'Psychology',
        role: 'student'
    }
];

const seedDatabase = async () => {
    let connection;

    try {
        // Create database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'campus_connect'
        });

        console.log('✅ Connected to database');

        // Check if users already exist
        const [existingUsers] = await connection.execute('SELECT COUNT(*) as count FROM users');

        if (existingUsers[0].count > 0) {
            console.log('⚠️  Users already exist in database. Skipping seed.');
            return;
        }

        // Hash passwords and insert users
        for (const user of sampleUsers) {
            const hashedPassword = await bcrypt.hash(user.password, 10);

            await connection.execute(`
        INSERT INTO users (firstName, lastName, email, password, studentId, department, role)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [user.firstName, user.lastName, user.email, hashedPassword, user.studentId, user.department, user.role]);

            console.log(`✅ Added user: ${user.firstName} ${user.lastName}`);
        }

        console.log('🎉 Database seeded successfully!');
        console.log(`📊 Added ${sampleUsers.length} sample users`);
        console.log('\nSample user credentials:');
        console.log('Email: john.doe@university.edu');
        console.log('Password: password123');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
};

// Run the seed function
seedDatabase();
