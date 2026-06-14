# 📋 Production Deployment Checklist

## Pre-Deployment (Before going live)

### Repository & Code
- [ ] All code committed and pushed to main branch
- [ ] No uncommitted changes (`git status` is clean)
- [ ] No secrets or `.env` files in repository
- [ ] `.gitignore` properly configured
- [ ] Latest version tagged: `git tag -a v1.0.0 -m "Production release"`

### Configuration
- [ ] `.env` file created from `.env.example`
- [ ] `JWT_SECRET` set to secure 32+ character string
- [ ] `ENVIRONMENT=production` set in `.env`
- [ ] `DEBUG=false` set in `.env`
- [ ] `CORS_ORIGIN` matches your domain
- [ ] `LOG_LEVEL=INFO` (not DEBUG in production)
- [ ] All required environment variables documented

### Database
- [ ] Database initialized: `python3 -c "from backend import db; db.init_db()"`
- [ ] Demo user created: `python3 -c "from backend import auth; auth.ensure_demo_user()"`
- [ ] Database file permissions verified (readable/writable)
- [ ] Backup strategy configured
- [ ] Database integrity checked: `sqlite3 data/skillbridge.db "PRAGMA integrity_check;"`

### Frontend
- [ ] Build validated: `npm run build`
- [ ] No console errors in browser
- [ ] Responsive design tested on mobile/tablet/desktop
- [ ] All static assets loading correctly
- [ ] SSL/TLS certificate valid and trusted

### Backend
- [ ] Python 3.8+ installed
- [ ] Node.js 14+ installed
- [ ] Dependencies installed: `npm install`
- [ ] Python dependencies installed: `pip install -r requirements.txt`
- [ ] Health check endpoint responding: `curl http://localhost:5173/api/health`
- [ ] Login functionality tested with demo credentials

### Security
- [ ] SSL/TLS certificate installed and valid
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Security headers configured (via Nginx or app)
- [ ] Firewall rules configured
- [ ] SSH key-based authentication enabled (if VPS)
- [ ] Database credentials not exposed in logs
- [ ] API keys and secrets not logged
- [ ] Rate limiting configured

### Infrastructure
- [ ] Reverse proxy (Nginx) configured and tested
- [ ] DNS records pointing to correct server
- [ ] Server resources adequate (CPU, RAM, disk)
- [ ] Monitoring tools configured
- [ ] Logging configured and tested
- [ ] Backup schedule configured

---

## Deployment Methods

### Quick Deployment Checklist

#### If using Docker Compose:
```bash
- [ ] Docker installed: docker --version
- [ ] Docker Compose installed: docker-compose --version
- [ ] .env file created with JWT_SECRET
- [ ] docker-compose up -d executed without errors
- [ ] Container running: docker ps
- [ ] Health check passing: docker-compose logs
```

#### If using Linux SystemD:
```bash
- [ ] skillbridge.service copied to /etc/systemd/system/
- [ ] Paths updated in service file
- [ ] systemctl daemon-reload executed
- [ ] Service enabled: sudo systemctl enable skillbridge
- [ ] Service started: sudo systemctl start skillbridge
- [ ] Service running: sudo systemctl status skillbridge
```

#### If using Nginx reverse proxy:
```bash
- [ ] skillbridge.nginx copied to /etc/nginx/sites-available/
- [ ] Domain name updated in config
- [ ] SSL certificate installed
- [ ] Config tested: sudo nginx -t
- [ ] Nginx reloaded: sudo systemctl reload nginx
- [ ] HTTPS working: curl https://yourdomain.com/api/health
```

---

## Post-Deployment Verification

### Immediate Checks (First 5 minutes)
- [ ] Website loads without errors
- [ ] Health check endpoint responds: `curl https://yourdomain.com/api/health`
- [ ] Login page appears
- [ ] Demo login works (email: demo@skillbridge.local, password: demo-pass)
- [ ] No errors in server logs
- [ ] HTTPS certificate appears valid in browser

### Functional Testing (Next 30 minutes)
- [ ] Can create new user account (if registration enabled)
- [ ] Can log in with created account
- [ ] Can create a new case analysis
- [ ] Recommendations display correctly
- [ ] Cases can be saved and retrieved
- [ ] Logout works properly
- [ ] Mobile responsive design works

### Performance Testing (First hour)
- [ ] API response time < 500ms (check logs)
- [ ] Page load time < 2 seconds
- [ ] No console errors in browser
- [ ] Memory usage stable (not constantly growing)
- [ ] CPU usage < 50%
- [ ] Database queries performing well

### Security Verification (First day)
- [ ] HTTPS certificate valid (browser shows green lock)
- [ ] Security headers present (use browser DevTools)
- [ ] CORS properly configured (no spurious errors)
- [ ] Login credentials not exposed in network tab
- [ ] No sensitive data in logs
- [ ] Rate limiting working (test with rapid requests)

### Monitoring Setup (First day)
- [ ] Logs being written to file
- [ ] Log rotation working (not disk filling up)
- [ ] Uptime monitoring configured
- [ ] Alert system tested
- [ ] Database backups running
- [ ] Backup files verifiable

---

## Common Issues & Solutions

### Issue: "Port already in use"
**Solution:**
```bash
# Find process on port
lsof -i :5173
# Or if using Docker
docker ps | grep skillbridge
```

### Issue: "Database locked"
**Solution:**
```bash
# Restart service
sudo systemctl restart skillbridge
# Or
docker-compose restart skillbridge
```

### Issue: "SSL certificate errors"
**Solution:**
```bash
# Verify certificate validity
openssl x509 -in /path/to/cert.pem -text -noout
# Renew if needed
sudo certbot renew --force-renewal
```

### Issue: "Memory usage increasing"
**Solution:**
- Check for memory leaks in logs
- Restart service: `sudo systemctl restart skillbridge`
- Review database size: `du -h data/skillbridge.db`
- Check number of active sessions

### Issue: "High CPU usage"
**Solution:**
- Check for runaway processes: `top`
- Review recent deployments
- Monitor database queries
- Consider load balancing

### Issue: "Slow API responses"
**Solution:**
- Check database performance: `sqlite3 data/skillbridge.db "VACUUM;"`
- Review logs for errors
- Check network connectivity
- Monitor system resources

---

## Rollback Procedure

If something goes wrong after deployment:

```bash
# 1. Stop the service
sudo systemctl stop skillbridge
# Or: docker-compose down

# 2. Restore from backup
sqlite3 data/skillbridge.db ".backup /path/to/backup/rollback.db"
# Or: docker cp skillbridge-agent:/app/data/skillbridge.db ./backup/

# 3. Revert to previous code version
git checkout previous-commit-hash

# 4. Restart service
sudo systemctl start skillbridge
# Or: docker-compose up -d

# 5. Verify
curl https://yourdomain.com/api/health
```

---

## Monitoring Queries

### Check Service Status
```bash
# SystemD
sudo systemctl status skillbridge
sudo journalctl -u skillbridge -f

# Docker
docker ps | grep skillbridge
docker-compose logs -f

# Direct check
curl http://localhost:5173/api/health
```

### View Recent Logs
```bash
# Last 50 lines
tail -50 logs/skillbridge.log

# Real-time monitoring
tail -f logs/skillbridge.log

# Errors only
grep ERROR logs/skillbridge.log
```

### Database Stats
```bash
# Database size
du -h data/skillbridge.db

# Row counts
sqlite3 data/skillbridge.db "SELECT name, COUNT(*) FROM users; SELECT name, COUNT(*) FROM cases;"

# Database integrity
sqlite3 data/skillbridge.db "PRAGMA integrity_check;"
```

### Performance Metrics
```bash
# CPU and Memory (top process)
ps aux | grep backend.server

# Network connections
netstat -tlnp | grep 5173

# Disk usage
df -h /
du -sh /app/data /app/logs
```

---

## Daily Maintenance Tasks

### Automated (via cron):
```bash
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup_db.sh

# Weekly vacuum (optimize database)
0 3 * * 0 sqlite3 /opt/skillbridge/data/skillbridge.db "VACUUM;"

# Cleanup old logs (keep 30 days)
0 4 * * * find /opt/skillbridge/logs -name "*.log" -mtime +30 -delete
```

### Manual (daily checks):
- [ ] Check disk space: `df -h`
- [ ] Verify service running: `systemctl status skillbridge`
- [ ] Check recent errors: `tail -20 logs/skillbridge.log`
- [ ] Monitor uptime
- [ ] Verify backups created: `ls -la backups/`

---

## Emergency Contacts

- **Server Provider Support:** [Your hosting provider]
- **Domain Registrar:** [Your domain registrar]
- **SSL Certificate Authority:** [Your CA, usually Let's Encrypt]
- **On-call Developer:** [Your contact info]

---

## Sign-Off

- [ ] Deployment approved by: _________________
- [ ] Date: _________________
- [ ] Deployed by: _________________
- [ ] Tested by: _________________

---

## Resources

- [Main README](../README.md)
- [Deployment Guide](../DEPLOYMENT.md)
- [Agent Guidelines](../AGENTS.md)
- [GitHub Repository](https://github.com/mrigeshkoyande/Agent-Infosys)
