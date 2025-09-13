# 🐳 CampusConnectPlayHub - Docker Deployment

Your CampusConnectPlayHub application is now fully containerized and ready to run with Docker! 

## 🚀 Quick Start

### Windows Users:
```bash
# Double-click the start-docker.bat file or run:
start-docker.bat
```

### Linux/Mac Users:
```bash
# Make executable and run:
chmod +x start-docker.sh
./start-docker.sh
```

### Manual Start:
```bash
# 1. Copy environment template
cp env.example .env

# 2. Edit .env with your values (especially Google OAuth credentials)

# 3. Start all services
docker compose up --build
```

## 🌐 Access Your Application

Once running, access your application at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Database**: localhost:3307

## 🔑 Default Login Credentials

**Admin User:**
- Email: `admin@campusconnect.com`
- Password: `admin123`

**Student User:**
- Email: `student@campusconnect.com`
- Password: `student123`

## 📋 What's Included

### ✅ Complete Docker Setup
- **Frontend**: React 18 + Nginx (Port 3000)
- **Backend**: Node.js 18 + Express (Port 5000)
- **Database**: MySQL 8.0 (Port 3306)
- **Networking**: Custom bridge network
- **Volumes**: Persistent data storage

### ✅ Production-Ready Features
- Multi-stage Docker builds for optimization
- Health checks for all services
- Automatic database initialization
- Environment variable configuration
- Security headers and rate limiting
- File upload handling with persistent storage

### ✅ Development Features
- Hot reloading support
- Comprehensive logging
- Easy debugging with container access
- Volume mounting for development

## 🛠️ Docker Commands

```bash
# Start all services
docker compose up

# Start in background
docker compose up -d

# Stop all services
docker compose down

# Stop and remove all data
docker compose down -v

# View logs
docker compose logs

# Rebuild containers
docker compose up --build

# Access container shell
docker compose exec backend sh
docker compose exec mysql mysql -u campus_user -p campus_connect
```

## 🔧 Configuration

### Environment Variables (.env file)
```bash
# Database
DB_HOST=mysql
DB_USER=campus_user
DB_PASSWORD=campusconnect123
DB_NAME=campus_connect

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Google OAuth (Required)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# URLs
FRONTEND_URL=http://localhost:3000
```

## 🎯 Features Available

- ✅ **Authentication**: JWT + Google OAuth
- ✅ **User Management**: Students, Managers, Admins
- ✅ **Friend System**: Add friends, notifications
- ✅ **Study Groups**: Create and manage groups
- ✅ **Routine Management**: Schedule classes and activities
- ✅ **Gaming**: Tic-Tac-Toe, Rock-Paper-Scissors
- ✅ **Real-time Chat**: Direct and group messaging
- ✅ **Feedback System**: User feedback and bug reports
- ✅ **Admin Console**: User and system management
- ✅ **File Uploads**: Profile images and attachments
- ✅ **Dark Theme**: Modern, sleek UI design
- ✅ **Responsive Design**: Works on all devices

## 🚨 Important Notes

1. **Google OAuth Setup**: You must configure Google OAuth credentials in the `.env` file
2. **Port Conflicts**: Ensure ports 3000, 5000, and 3306 are available
3. **Data Persistence**: Database data is stored in Docker volumes
4. **Security**: Change default passwords and JWT secret for production

## 🆘 Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
netstat -ano | findstr :3000
netstat -ano | findstr :5000
netstat -ano | findstr :3306
```

### Container Won't Start
```bash
# Check logs
docker compose logs [service-name]

# Check container status
docker compose ps
```

### Database Issues
```bash
# Reset database
docker compose down -v
docker compose up --build
```

## 📚 Additional Resources

- [Docker Setup Guide](docker-setup.md) - Detailed setup instructions
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [React Documentation](https://reactjs.org/docs/)
- [Express.js Documentation](https://expressjs.com/)

## 🎉 You're All Set!

Your CampusConnectPlayHub application is now fully containerized and ready to run. The Docker setup provides:

- **Easy deployment** across different environments
- **Consistent behavior** regardless of the host system
- **Scalable architecture** for future growth
- **Production-ready** configuration
- **Development-friendly** setup

Enjoy your fully functional campus social platform! 🎓✨
