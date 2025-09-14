const mysql = require('mysql2/promise');

const waitForMySQL = async () => {
    const maxRetries = 30;
    const retryDelay = 2000; // 2 seconds

    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`Attempting to connect to MySQL (attempt ${i + 1}/${maxRetries})...`);

            const connection = await mysql.createConnection({
                host: process.env.DB_HOST || 'mysql',
                user: process.env.DB_USER || 'campus_user',
                password: process.env.DB_PASSWORD || 'campusconnect123',
                database: process.env.DB_NAME || 'campus_connect',
                connectTimeout: 5000,
            });

            await connection.ping();
            await connection.end();

            console.log('✅ MySQL is ready!');
            return true;
        } catch (error) {
            console.log(`❌ MySQL connection failed: ${error.message}`);

            if (i === maxRetries - 1) {
                console.error('❌ Failed to connect to MySQL after maximum retries');
                throw error;
            }

            console.log(`⏳ Waiting ${retryDelay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
};

module.exports = waitForMySQL;
