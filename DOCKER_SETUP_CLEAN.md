# 🐳 **CampusConnectPlayHub - Clean Docker Setup**

## ✅ **Cleanup Complete!**

All Render-specific files have been removed and your project is back to a clean Docker setup with MySQL.

## 🚀 **Quick Start**

### **1. Start Your Application**
```bash
# Windows
docker-compose up -d

# Linux/Mac
docker compose up -d
```

### **2. Access Your Application**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **MySQL Database**: localhost:3307

### **3. Default Login Credentials**
- **Admin**: `admin@campusconnect.com` / `admin123`
- **Student**: `student@campusconnect.com` / `student123`

## 🗄️ **MySQL Database Configuration**

### **Database Details:**
- **Host**: `mysql` (internal Docker network)
- **Port**: `3306` (internal), `3307` (external)
- **Database**: `campus_connect`
- **User**: `campus_user`
- **Password**: `campusconnect123`

### **Data Persistence:**
- ✅ **All data is stored** in Docker volumes
- ✅ **Survives container restarts**
- ✅ **Automatic backups** via Docker volumes

## 🔧 **Environment Variables**

Create a `.env` file in your project root:
```env
# Database Configuration
DB_HOST=mysql
DB_USER=campus_user
DB_PASSWORD=campusconnect123
DB_NAME=campus_connect

# JWT Secret (change in production)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 📁 **Project Structure**

```
CampusConnectPlayHub/
├── docker-compose.yml          # Main Docker configuration
├── Dockerfile                  # Frontend Dockerfile
├── nginx.conf                  # Nginx configuration
├── .env                        # Environment variables
├── backend/
│   ├── Dockerfile             # Backend Dockerfile
│   ├── init.sql               # Database initialization
│   └── ...
├── src/                       # React frontend
└── ...
```

## 🛠️ **Available Commands**

### **Start Services**
```bash
docker-compose up -d
```

### **Stop Services**
```bash
docker-compose down
```

### **View Logs**
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mysql
```

### **Restart Services**
```bash
docker-compose restart
```

### **Rebuild Services**
```bash
docker-compose up -d --build
```

## 🔍 **Health Checks**

All services have health checks:
- **MySQL**: `mysqladmin ping`
- **Backend**: `wget http://localhost:5000/api/health`
- **Frontend**: `wget http://localhost:80`

## 📊 **Service Status**

Check service status:
```bash
docker-compose ps
```

Expected output:
```
NAME                     STATUS
campusconnect_mysql      Up (healthy)
campusconnect_backend    Up (healthy)
campusconnect_frontend   Up (healthy)
```

## 🗃️ **Database Management**

### **Connect to MySQL**
```bash
# Using Docker
docker exec -it campusconnect_mysql mysql -u campus_user -p campus_connect

# Using external client
Host: localhost
Port: 3307
User: campus_user
Password: campusconnect123
Database: campus_connect
```

### **Backup Database**
```bash
docker exec campusconnect_mysql mysqldump -u campus_user -p campus_connect > backup.sql
```

### **Restore Database**
```bash
docker exec -i campusconnect_mysql mysql -u campus_user -p campus_connect < backup.sql
```

## 🚨 **Troubleshooting**

### **Port Conflicts**
If you get port conflicts:
```bash
# Check what's using the ports
netstat -ano | findstr :3000
netstat -ano | findstr :5000
netstat -ano | findstr :3307
```

### **Container Issues**
```bash
# Remove all containers and start fresh
docker-compose down
docker system prune -f
docker-compose up -d
```

### **Database Issues**
```bash
# Reset database
docker-compose down
docker volume rm campusconnectplayhub_mysql_data
docker-compose up -d
```

## 🎯 **Features Available**

- ✅ **User Authentication** (Login/Register)
- ✅ **Admin Dashboard**
- ✅ **Student Profiles**
- ✅ **Study Groups**
- ✅ **Real-time Chat**
- ✅ **Arcade Games** (Tic-Tac-Toe, Rock Paper Scissors)
- ✅ **Routine Manager**
- ✅ **Friend System**
- ✅ **Notifications**
- ✅ **Bug Reports**
- ✅ **Feedback System**

## 🌐 **Access URLs**

- **Main App**: http://localhost:3000
- **API Health**: http://localhost:5000/api/health
- **Admin Panel**: http://localhost:3000/admin
- **Student Dashboard**: http://localhost:3000/dashboard

## 📝 **Notes**

- **MySQL runs on port 3307** to avoid conflicts with local MySQL
- **All data persists** in Docker volumes
- **Health checks ensure** services are ready before starting
- **Automatic database initialization** on first run
- **Default users created** automatically

## 🎉 **You're Ready!**

Your CampusConnectPlayHub is now running with a clean Docker setup and MySQL database. All Render-specific configurations have been removed, and you have a fully functional local development environment.

**Start your app with**: `docker-compose up -d`
