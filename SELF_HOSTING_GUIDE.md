# 🏠 Self-Hosting with Docker

## What You Need for Self-Hosting

### **Required:**
1. **VPS/Server** (Virtual Private Server)
   - DigitalOcean Droplet ($5/month)
   - Linode VPS ($5/month)
   - AWS EC2 instance
   - Google Cloud VM

2. **Domain Name** (optional but recommended)
   - Namecheap, GoDaddy, etc.
   - Cost: ~$10-15/year

3. **Docker & Docker Compose** (already installed on server)

### **Steps for Self-Hosting:**

#### **1. Get a VPS**
```bash
# Example: DigitalOcean Droplet
# Choose Ubuntu 22.04 LTS
# Minimum: 1GB RAM, 1 CPU, 25GB SSD
```

#### **2. Install Docker on Server**
```bash
# SSH into your server
ssh root@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin
```

#### **3. Upload Your Project**
```bash
# Option A: Git clone
git clone https://github.com/yourusername/CampusConnectPlayHub.git
cd CampusConnectPlayHub

# Option B: Upload files via SCP/SFTP
scp -r ./CampusConnectPlayHub root@your-server-ip:/root/
```

#### **4. Configure Environment**
```bash
# Edit .env file
nano .env

# Set production values:
DB_HOST=mysql
DB_USER=campus_user
DB_PASSWORD=your-secure-password
JWT_SECRET=your-very-secure-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FRONTEND_URL=https://yourdomain.com
```

#### **5. Start Your Application**
```bash
# Start all services
docker compose up -d

# Check status
docker compose ps
```

#### **6. Configure Domain (Optional)**
```bash
# Point your domain to server IP
# A record: yourdomain.com -> your-server-ip
# CNAME: www.yourdomain.com -> yourdomain.com
```

#### **7. Set Up HTTPS (Optional)**
```bash
# Install Certbot for free SSL
apt install certbot
certbot --nginx -d yourdomain.com
```

## 🔧 Server Requirements

### **Minimum:**
- **RAM**: 1GB (2GB recommended)
- **CPU**: 1 core (2 cores recommended)
- **Storage**: 25GB SSD
- **OS**: Ubuntu 22.04 LTS

### **Recommended:**
- **RAM**: 2GB
- **CPU**: 2 cores
- **Storage**: 50GB SSD
- **Bandwidth**: 1TB/month

## 💰 Cost Breakdown

### **Monthly Costs:**
- **VPS**: $5-10/month
- **Domain**: $1-2/month (if you buy one)
- **Total**: $6-12/month

### **One-time Costs:**
- **Domain**: $10-15/year

## ⚠️ Self-Hosting Challenges

### **You'll Need to Handle:**
- ❌ **Server maintenance**
- ❌ **Security updates**
- ❌ **Backup management**
- ❌ **SSL certificate renewal**
- ❌ **Server monitoring**
- ❌ **Scaling issues**

## 🎯 Recommendation

**For beginners**: Use Railway or Render (managed hosting)
**For learning**: Try self-hosting on a small VPS
**For production**: Use managed hosting with custom domain

## 🚀 Quick Start Commands

```bash
# On your server:
git clone https://github.com/yourusername/CampusConnectPlayHub.git
cd CampusConnectPlayHub
cp env.example .env
# Edit .env with your values
docker compose up -d
```

Your app will be available at your server's IP address!
