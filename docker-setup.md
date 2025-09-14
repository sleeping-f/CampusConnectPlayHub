# CampusConnectPlayHub - Docker Setup Guide

This guide will help you run the CampusConnectPlayHub application using Docker containers.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)
- At least 4GB of available RAM
- Ports 3000, 5000, and 3306 available on your system

## Quick Start

1. **Clone and navigate to the project directory**
   ```bash
   cd CampusConnectPlayHub
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   Edit the `.env` file with your actual values, especially:
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for Google OAuth
   - `JWT_SECRET` for authentication
   - Database credentials if you want to customize them

3. **Build and start all services**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Database: localhost:3306

## Default Login Credentials

The system comes with default users for testing:

**Admin User:**
- Email: admin@campusconnect.com
- Password: admin123

**Student User:**
- Email: student@campusconnect.com
- Password: student123

## Services

### Frontend (React + Nginx)
- **Container**: campusconnect_frontend
- **Port**: 3000
- **Technology**: React 18 with Nginx for serving static files
- **Features**: 
  - Modern dark-themed UI with animations
  - Responsive design
  - API proxy configuration

### Backend (Node.js + Express)
- **Container**: campusconnect_backend
- **Port**: 5000
- **Technology**: Node.js 18, Express.js, MySQL2
- **Features**:
  - RESTful API
  - JWT authentication
  - Google OAuth integration
  - File upload handling
  - Rate limiting and security headers

### Database (MySQL 8.0)
- **Container**: campusconnect_mysql
- **Port**: 3306
- **Technology**: MySQL 8.0
- **Features**:
  - Persistent data storage
  - Automatic schema initialization
  - Default test data

## Docker Commands

### Start services
```bash
docker-compose up
```

### Start services in background
```bash
docker-compose up -d
```

### Rebuild and start
```bash
docker-compose up --build
```

### Stop services
```bash
docker-compose down
```

### Stop and remove volumes (⚠️ This will delete all data)
```bash
docker-compose down -v
```

### View logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs frontend
docker-compose logs backend
docker-compose logs mysql
```

### Access container shell
```bash
# Backend container
docker-compose exec backend sh

# MySQL container
docker-compose exec mysql mysql -u campus_user -p campus_connect
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host | mysql |
| `DB_USER` | Database user | campus_user |
| `DB_PASSWORD` | Database password | campusconnect123 |
| `DB_NAME` | Database name | campus_connect |
| `JWT_SECRET` | JWT signing secret | your-super-secret-jwt-key-change-in-production |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | (required) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | (required) |
| `FRONTEND_URL` | Frontend URL | http://localhost:3000 |
| `NODE_ENV` | Node environment | production |

## Troubleshooting

### Port conflicts
If you get port conflicts, you can change the ports in `docker-compose.yml`:
```yaml
ports:
  - "3001:80"  # Change frontend port
  - "5001:5000"  # Change backend port
  - "3307:3306"  # Change database port
```

### Database connection issues
1. Ensure MySQL container is healthy: `docker-compose ps`
2. Check database logs: `docker-compose logs mysql`
3. Verify environment variables in `.env` file

### Frontend not loading
1. Check if backend is running: `docker-compose logs backend`
2. Verify API proxy configuration in `nginx.conf`
3. Check frontend logs: `docker-compose logs frontend`

### Permission issues (Linux/Mac)
If you encounter permission issues with file uploads:
```bash
sudo chown -R 1000:1000 backend/uploads
```

## Development

### Hot reloading (Development mode)
For development with hot reloading, you can run services individually:

```bash
# Start only database
docker-compose up mysql

# Run backend locally
cd backend
npm install
npm run dev

# Run frontend locally
npm install
npm start
```

### Database migrations
The database schema is automatically initialized when the MySQL container starts for the first time. If you need to reset the database:

```bash
docker-compose down -v
docker-compose up --build
```

## Production Deployment

For production deployment:

1. **Update environment variables** with production values
2. **Use strong passwords** for database and JWT secret
3. **Configure proper CORS** origins
4. **Set up SSL/TLS** certificates
5. **Use a reverse proxy** like Traefik or Nginx
6. **Set up monitoring** and logging
7. **Configure backups** for the database

## Features Included

- ✅ User authentication (JWT + Google OAuth)
- ✅ Role-based access control (Student, Manager, Admin)
- ✅ Friend system with notifications
- ✅ Study groups management
- ✅ Routine management
- ✅ Gaming features (Tic-Tac-Toe, Rock-Paper-Scissors)
- ✅ Real-time chat system
- ✅ Feedback and bug reporting
- ✅ Admin console
- ✅ File upload handling
- ✅ Responsive dark-themed UI
- ✅ Database persistence
- ✅ Health checks
- ✅ Security headers and rate limiting

## Support

If you encounter any issues:
1. Check the logs: `docker-compose logs`
2. Verify all environment variables are set
3. Ensure all required ports are available
4. Check Docker Desktop is running and has sufficient resources
