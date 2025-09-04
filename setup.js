#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 CampusConnectPlayHub Setup Script');
console.log('=====================================\n');

// Check if Node.js is installed
try {
    const nodeVersion = process.version;
    console.log(`✅ Node.js version: ${nodeVersion}`);
} catch (error) {
    console.error('❌ Node.js is not installed. Please install Node.js v16 or higher.');
    process.exit(1);
}

// Check if npm is available
try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    console.log(`✅ npm version: ${npmVersion}`);
} catch (error) {
    console.error('❌ npm is not available. Please install npm.');
    process.exit(1);
}

// Install frontend dependencies
console.log('\n📦 Installing frontend dependencies...');
try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Frontend dependencies installed successfully');
} catch (error) {
    console.error('❌ Failed to install frontend dependencies');
    process.exit(1);
}

// Install backend dependencies
console.log('\n📦 Installing backend dependencies...');
try {
    execSync('npm install', { cwd: './backend', stdio: 'inherit' });
    console.log('✅ Backend dependencies installed successfully');
} catch (error) {
    console.error('❌ Failed to install backend dependencies');
    process.exit(1);
}

// Check if .env file exists in backend
const envPath = path.join(__dirname, 'backend', '.env');
if (!fs.existsSync(envPath)) {
    console.log('\n⚙️  Setting up environment variables...');

    // Copy env.example to .env
    const envExamplePath = path.join(__dirname, 'backend', 'env.example');
    if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log('✅ Environment file created from template');
        console.log('⚠️  Please edit backend/.env with your configuration');
    } else {
        console.log('⚠️  env.example not found. Please create backend/.env manually');
    }
} else {
    console.log('✅ Environment file already exists');
}

console.log('\n🎉 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Configure your MySQL database');
console.log('2. Edit backend/.env with your database credentials');
console.log('3. Start the backend server: cd backend && npm run dev');
console.log('4. Start the frontend: npm start');
console.log('5. Open http://localhost:3000 in your browser');
console.log('\n📚 For detailed instructions, see README.md');
