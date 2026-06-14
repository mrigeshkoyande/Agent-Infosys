# 🚀 Deployment Guide - SkillBridge Agent

Complete step-by-step guide for deploying SkillBridge Agent to production environments.

---

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Deployment Methods](#deployment-methods)
4. [Security Hardening](#security-hardening)
5. [Database Management](#database-management)
6. [Monitoring & Logging](#monitoring--logging)
7. [Troubleshooting](#troubleshooting)
8. [Scaling](#scaling)

---

## ✅ Pre-Deployment Checklist

Before deploying to production, verify:

- [ ] **Git repository clean** - No uncommitted changes
  ```bash
  git status
  ```

- [ ] **Environment variables set** - Copy `.env.example` to `.env`
  ```bash
  cp .env.example .env
  ```

- [ ] **JWT_SECRET configured** - Minimum 32 characters
  ```bash
  # Generate a secure secret
  python -c "import secrets; print(secrets.token_urlsafe(32))"
  ```

- [ ] **Database initialized** - Run migrations
  ```bash
  python -c "from backend import db; db.init_db()"
  ```

- [ ] **Frontend validated** - Run build checks
  ```bash
  npm run build
  ```

- [ ] **SSL/TLS certificates ready** - For HTTPS (required for production)

- [ ] **Firewall rules configured** - Allow port 5173 (or your port)

- [ ] **Backup strategy in place** - Data directory backed up

- [ ] **Monitoring tools ready** - Logging, uptime checks

---

## 🔧 Environment Setup

### 1. Create Production `.env` File

```bash
# Copy template
cp .env.example .env

# Edit with production values
nano .env
```

### 2. Required Environment Variables

```bash
# Production Mode
ENVIRONMENT=production
DEBUG=false

# Security (CRITICAL)
JWT_SECRET=<generate-32-char-random-string>
CORS_ORIGIN=https://yourdomain.com

# Server
HOST=0.0.0.0
PORT=5173

# Database (ensure writable location)
SKILLBRIDGE_DB=/var/lib/skillbridge/data/skillbridge.db

# Logging
LOG_LEVEL=INFO
LOG_FILE=/var/log/skillbridge/skillbridge.log
```

### 3. Directory Structure for Production

```bash
# Create required directories
mkdir -p /var/lib/skillbridge/data
mkdir -p /var/lib/skillbridge/backups
mkdir -p /var/log/skillbridge
mkdir -p /var/lib/skillbridge/logs

# Set proper permissions
chmod 755 /var/lib/skillbridge
chmod 755 /var/log/skillbridge
```

---

## 📦 Deployment Methods

### Method 1: Direct Python Execution (Simple)

**Best for:** Small deployments, VPS, or testing

```bash
# Clone repository
git clone https://github.com/mrigeshkoyande/Agent-Infosys.git
cd Agent-Infosys

# Install dependencies
npm install

# Validate build
npm run build

# Start server (background)
nohup npm start > server.log 2>&1 &

# Check it's running
curl http://localhost:5173/api/health
```

### Method 2: SystemD Service (Recommended for Linux)

Create `/etc/systemd/system/skillbridge.service`:

```ini
[Unit]
Description=SkillBridge Agent - Career Counseling Platform
After=network.target

[Service]
Type=simple
User=skillbridge
WorkingDirectory=/opt/skillbridge
Environment="PATH=/usr/bin:/usr/local/bin"
EnvironmentFile=/opt/skillbridge/.env
ExecStart=/usr/bin/python3 -m backend.server
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Enable and start:**

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable on boot
sudo systemctl enable skillbridge

# Start service
sudo systemctl start skillbridge

# Check status
sudo systemctl status skillbridge

# View logs
sudo journalctl -u skillbridge -f
```

### Method 3: Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install Node.js for frontend build
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

# Copy application
COPY . .

# Install dependencies
RUN npm install

# Build validation
RUN npm run build

# Create data directory
RUN mkdir -p data logs

# Expose port
EXPOSE 5173

# Set environment
ENV ENVIRONMENT=production
ENV HOST=0.0.0.0
ENV DEBUG=false

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5173/api/health')" || exit 1

# Start server
CMD ["python", "-m", "backend.server"]
```

**Build and run:**

```bash
# Build image
docker build -t skillbridge:latest .

# Run container
docker run -d \
  --name skillbridge \
  -p 5173:5173 \
  -v skillbridge-data:/app/data \
  -v skillbridge-logs:/app/logs \
  -e ENVIRONMENT=production \
  -e JWT_SECRET=your-secret-key \
  -e CORS_ORIGIN=https://yourdomain.com \
  skillbridge:latest

# Check logs
docker logs -f skillbridge
```

### Method 4: Docker Compose (Recommended for Containers)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  skillbridge:
    build: .
    container_name: skillbridge-agent
    ports:
      - "5173:5173"
    environment:
      ENVIRONMENT: production
      DEBUG: 'false'
      HOST: 0.0.0.0
      PORT: 5173
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: ${CORS_ORIGIN}
      SKILLBRIDGE_DB: /app/data/skillbridge.db
      LOG_FILE: /app/logs/skillbridge.log
    volumes:
      - skillbridge-data:/app/data
      - skillbridge-logs:/app/logs
      - .env:/app/.env:ro
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5173/api/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

volumes:
  skillbridge-data:
    driver: local
  skillbridge-logs:
    driver: local
```

**Start:**

```bash
docker-compose up -d
docker-compose logs -f
```

---

## 🔒 Security Hardening

### 1. Nginx Reverse Proxy (Recommended)

Configure Nginx to sit in front of your Python server:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### 2. SSL/TLS Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --nginx -d yourdomain.com

# Auto-renewal (already enabled by default)
sudo systemctl status certbot.timer
```

### 3. Firewall Configuration

```bash
# UFW on Ubuntu
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
```

### 4. Database Security

```bash
# Set restrictive permissions
chmod 600 /var/lib/skillbridge/data/skillbridge.db
chown skillbridge:skillbridge /var/lib/skillbridge/data/skillbridge.db

# Regular backups
0 2 * * * /usr/bin/sqlite3 /var/lib/skillbridge/data/skillbridge.db ".backup /var/lib/skillbridge/backups/skillbridge-$(date +\%Y\%m\%d-\%H\%M\%S).db"
```

---

## 💾 Database Management

### Initialization

```bash
# Initialize on first run
python -c "from backend import db; db.init_db()"

# Create demo user
python -c "from backend import auth; auth.ensure_demo_user()"
```

### Backup Strategy

```bash
#!/bin/bash
# backup_db.sh

BACKUP_DIR="/var/lib/skillbridge/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DB_PATH="/var/lib/skillbridge/data/skillbridge.db"

# Create backup
sqlite3 $DB_PATH ".backup $BACKUP_DIR/skillbridge-$TIMESTAMP.db"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "skillbridge-*.db" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/skillbridge-$TIMESTAMP.db"
```

**Schedule with cron:**

```bash
0 2 * * * /usr/local/bin/backup_db.sh
```

### Database Optimization

```bash
# Vacuum database (optimize)
python -c "import sqlite3; conn = sqlite3.connect('data/skillbridge.db'); conn.execute('VACUUM'); conn.close()"

# Check integrity
sqlite3 data/skillbridge.db "PRAGMA integrity_check;"
```

---

## 📊 Monitoring & Logging

### View Logs

```bash
# SystemD service logs
sudo journalctl -u skillbridge -f

# Docker logs
docker logs -f skillbridge-agent

# Direct file logs
tail -f /var/log/skillbridge/skillbridge.log
```

### Health Monitoring

```bash
# Simple health check
curl http://localhost:5173/api/health

# Continuous monitoring
watch -n 5 'curl -s http://localhost:5173/api/health | jq'
```

### Metrics to Track

- **API Response Time** - Should be < 500ms
- **CPU Usage** - Should stay < 50%
- **Memory Usage** - Should stay < 500MB
- **Error Rate** - Should be < 1%
- **Database Size** - Monitor for growth
- **Uptime** - Target 99.9%

### Uptime Monitoring Service

```bash
# Using uptimerobot.com (free tier available)
# or use simple curl monitoring

#!/bin/bash
# monitor.sh
while true; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/api/health)
  if [ $RESPONSE -ne 200 ]; then
    echo "Alert: Service returned $RESPONSE at $(date)"
    # Send alert (email, Slack, etc.)
  fi
  sleep 60
done
```

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :5173

# Kill process
kill -9 <PID>

# Or use different port
PORT=8080 python -m backend.server
```

### Database Locked

```bash
# Restart service
sudo systemctl restart skillbridge

# Or for Docker
docker restart skillbridge-agent
```

### High Memory Usage

```bash
# Check for memory leaks
top -p <PID>

# Consider reducing LOG_MAX_SIZE_MB
# or implementing log rotation
```

### CORS Errors

```bash
# Verify CORS_ORIGIN matches your domain
# Update .env:
CORS_ORIGIN=https://yourdomain.com

# Restart service
sudo systemctl restart skillbridge
```

### SSL Certificate Issues

```bash
# Check certificate validity
openssl s_client -connect yourdomain.com:443

# Renewal (automatic with certbot)
sudo certbot renew --dry-run
```

---

## 📈 Scaling

### Horizontal Scaling (Multiple Servers)

Use a load balancer (Nginx, HAProxy):

```nginx
upstream skillbridge_backend {
    server server1.example.com:5173;
    server server2.example.com:5173;
    server server3.example.com:5173;
}

server {
    listen 80;
    location / {
        proxy_pass http://skillbridge_backend;
    }
}
```

### Vertical Scaling (Single Server)

- Increase worker threads in server.py
- Optimize database queries
- Enable caching for static assets

### Database Scaling

```bash
# For large datasets, consider:
# 1. Database indexing on frequently queried columns
# 2. Archive old cases to separate database
# 3. Implement pagination for case listings
```

---

## 🎯 Production Checklist

After deployment, verify:

- [ ] Health check responds at `/api/health`
- [ ] Login works with demo credentials
- [ ] Can create and save cases
- [ ] Logs are being written to file
- [ ] Database backups are automated
- [ ] SSL/TLS certificate is valid
- [ ] CORS is properly configured
- [ ] Rate limiting is in place
- [ ] Monitoring is active
- [ ] Disaster recovery plan documented

---

## 📞 Support

For issues or questions:
1. Check [README.md](../README.md) for general troubleshooting
2. Review logs: `tail -f logs/skillbridge.log`
3. Test API: `curl http://localhost:5173/api/health`
4. Check GitHub Issues: https://github.com/mrigeshkoyande/Agent-Infosys/issues
