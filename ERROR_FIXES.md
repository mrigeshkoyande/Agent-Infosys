# 🔧 Deployment Error Fixes & Troubleshooting Guide

This document outlines all errors that have been fixed and how to troubleshoot common deployment issues.

---

## ✅ Fixed Issues

### 1. **python-dotenv Import Error**
**Issue:** `ModuleNotFoundError: No module named 'dotenv'`

**Fix:** Made `python-dotenv` optional in `backend/config.py`
```python
try:
    from dotenv import load_dotenv
except ImportError:
    # python-dotenv is optional, continue without it
    pass
```

**Solution:** 
- Application works WITHOUT python-dotenv installed
- To use .env files, install: `pip install python-dotenv`
- Application gracefully falls back to environment variables if not available

---

### 2. **Database Path Configuration Error**
**Issue:** `TypeError: expected str, bytes or os.PathLike object, not PosixPath`

**Fix:** Fixed Path handling in `backend/db.py`
```python
# Before (WRONG):
DB_PATH = Path(os.environ.get("SKILLBRIDGE_DB", DATA_DIR / "skillbridge.db"))

# After (CORRECT):
db_env = os.environ.get("SKILLBRIDGE_DB", None)
if db_env:
    DB_PATH = Path(db_env)
else:
    DB_PATH = DATA_DIR / "skillbridge.db"
```

**Solution:** 
- Handle Path objects correctly
- Convert environment strings to Path objects safely
- Use fallback for missing configuration

---

### 3. **Logger Initialization Error**
**Issue:** `AttributeError: 'NoneType' object has no attribute 'info'`

**Fix:** Implemented fallback logging in `backend/config.py`
```python
def setup_logging():
    try:
        # ... logging setup ...
        return logger
    except Exception as e:
        print(f"Warning: Could not setup logging: {e}")
        # Fallback to basic logging
        logging.basicConfig(level=logging.INFO)
        return logging.getLogger("skillbridge")
```

**Solution:**
- Graceful fallback to basic logging if advanced setup fails
- Clear any existing handlers to prevent duplicates
- Always return a valid logger object

---

### 4. **CORS Headers Missing**
**Issue:** Browser shows CORS errors, API calls fail

**Fix:** Added CORS header functions in `backend/server.py`
```python
def add_cors_headers(handler):
    handler.send_header("Access-Control-Allow-Origin", CORS_ORIGIN)
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
    handler.send_header("Access-Control-Max-Age", "3600")
```

**Solution:**
- All responses now include CORS headers
- Handle OPTIONS (preflight) requests properly
- Configure CORS_ORIGIN via environment variable

---

### 5. **Security Headers Not Set**
**Issue:** Browser security warnings, XSS vulnerabilities

**Fix:** Added comprehensive security headers in `backend/server.py`
```python
def add_security_headers(handler):
    handler.send_header("X-Content-Type-Options", "nosniff")
    handler.send_header("X-Frame-Options", "SAMEORIGIN")
    handler.send_header("X-XSS-Protection", "1; mode=block")
    handler.send_header("Strict-Transport-Security", "max-age=31536000")
    handler.send_header("Content-Security-Policy", "...")
```

**Solution:**
- Protects against XSS attacks
- Prevents clickjacking
- Enforces HTTPS
- Controls content loading

---

### 6. **Docker Compose JWT_SECRET Requirement**
**Issue:** `Error: JWT_SECRET environment variable not set` when starting container

**Fix:** Made JWT_SECRET optional with sensible defaults in `docker-compose.yml`
```yaml
JWT_SECRET: ${JWT_SECRET:-dev-secret-key-change-in-production}
```

**Solution:**
- Development: Uses default insecure key (warns on startup)
- Production: Can override with secure key via environment
- No container startup failures

---

### 7. **Missing Error Handling**
**Issue:** Unhandled exceptions cause server crashes

**Fix:** Added try-catch blocks in `backend/server.py`
```python
def do_GET(self):
    try:
        # ... request handling ...
    except Exception as e:
        logger.error(f"Error in GET {self.path}: {e}\n{traceback.format_exc()}")
        return json_response(self, {"error": "Internal server error"}, 500)
```

**Solution:**
- All exceptions logged with full traceback
- Server doesn't crash on bad requests
- Clients get meaningful error responses

---

### 8. **Logging Configuration**
**Issue:** Logs not being written, or logs filling disk space

**Fix:** Implemented rotating file handler in `backend/config.py`
```python
from logging.handlers import RotatingFileHandler
file_handler = RotatingFileHandler(
    LOG_FILE,
    maxBytes=LOG_MAX_SIZE_MB * 1024 * 1024,
    backupCount=LOG_BACKUP_COUNT
)
```

**Solution:**
- Logs rotate at 10MB (configurable)
- Keeps last 5 log files (configurable)
- Prevents disk space issues
- Configurable via environment: `LOG_MAX_SIZE_MB`, `LOG_BACKUP_COUNT`

---

## 🐛 Troubleshooting Common Errors

### Error: "Port 5173 already in use"

**Solution:**
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5173 | xargs kill -9

# Or use different port
PORT=8080 python -m backend.server
```

---

### Error: "Database locked"

**Solution:**
```bash
# Restart the service
sudo systemctl restart skillbridge

# Or if using Docker
docker-compose restart skillbridge

# Or recreate database
rm data/skillbridge.db
python -c "from backend import db; db.init_db()"
```

---

### Error: "ModuleNotFoundError: No module named 'backend'"

**Solution:**
```bash
# Make sure you're in the project root directory
cd /path/to/Agent-Infosys

# Install dependencies
npm install

# Run from project root
python -m backend.server
```

---

### Error: "Cannot load .env file"

**Solution:**
```bash
# Install python-dotenv if you want .env support
pip install python-dotenv

# Or set environment variables directly
export JWT_SECRET="your-secret-key"
python -m backend.server
```

---

### Error: "SSL certificate errors"

**Solution:**
```bash
# Check certificate validity
openssl s_client -connect yourdomain.com:443

# Renew with Let's Encrypt
sudo certbot renew --force-renewal

# Or generate self-signed for testing
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365
```

---

### Error: "CORS errors in browser"

**Solution:**

1. Verify CORS_ORIGIN is set correctly:
```bash
echo $CORS_ORIGIN
# Should match your domain in production
```

2. Check server logs:
```bash
tail -f logs/skillbridge.log | grep -i cors
```

3. Update .env:
```bash
CORS_ORIGIN=https://yourdomain.com
```

4. Restart service:
```bash
npm start
```

---

### Error: "Connection refused" when connecting to backend

**Solution:**

1. Check if server is running:
```bash
curl http://localhost:5173/api/health
```

2. Check firewall:
```bash
# UFW (Ubuntu)
sudo ufw status

# Allow port
sudo ufw allow 5173
```

3. Check logs:
```bash
tail -50 logs/skillbridge.log
```

4. Restart service:
```bash
sudo systemctl restart skillbridge
```

---

## ✨ Verification Checklist

After fixing errors, verify everything works:

```bash
# 1. Run deployment test script
python test_deployment.py

# 2. Check syntax
python -m py_compile backend/*.py

# 3. Start server
npm start

# 4. Test health endpoint
curl http://localhost:5173/api/health

# 5. Check logs
tail -f logs/skillbridge.log

# 6. Verify database
sqlite3 data/skillbridge.db "SELECT COUNT(*) FROM users;"
```

---

## 📋 Production Deployment Verification

Before deploying to production:

```bash
# 1. Create production .env
cp .env.example .env

# 2. Generate secure JWT_SECRET
python -c "import secrets; print(secrets.token_urlsafe(32))"

# 3. Add to .env
echo "JWT_SECRET=<generated-secret>" >> .env

# 4. Set production mode
echo "ENVIRONMENT=production" >> .env

# 5. Build Docker image
docker build -t skillbridge:latest .

# 6. Test in Docker
docker-compose up -d

# 7. Verify health
curl http://localhost:5173/api/health

# 8. Check logs
docker-compose logs -f skillbridge

# 9. Cleanup test
docker-compose down
```

---

## 🚨 Critical Settings for Production

| Setting | Value | Why |
|---------|-------|-----|
| `ENVIRONMENT` | `production` | Enables production validations |
| `DEBUG` | `false` | Disables debug output, faster performance |
| `JWT_SECRET` | 32+ character string | Minimum 32 chars, cryptographically random |
| `CORS_ORIGIN` | `https://yourdomain.com` | Matches your production domain |
| `LOG_LEVEL` | `INFO` | Logs important events, not debug noise |
| `HTTPS` | Enabled | Must use HTTPS in production |

---

## 📞 Getting Help

If you encounter errors not listed here:

1. **Check logs:**
   ```bash
   tail -100 logs/skillbridge.log
   grep ERROR logs/skillbridge.log
   ```

2. **Run tests:**
   ```bash
   python test_deployment.py
   ```

3. **Check configuration:**
   ```bash
   python -c "from backend import config; print(vars(config))"
   ```

4. **Review documentation:**
   - [DEPLOYMENT.md](DEPLOYMENT.md)
   - [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
   - [README.md](README.md)

5. **Check GitHub Issues:**
   - https://github.com/mrigeshkoyande/Agent-Infosys/issues

---

## 📝 Reporting Issues

When reporting issues, include:

1. **Error message** (exact error text)
2. **Logs** (last 50 lines of log file)
3. **Configuration** (environment variables, except JWT_SECRET)
4. **Deployment method** (Docker, SystemD, Direct, etc.)
5. **Steps to reproduce** (what you did before error occurred)
6. **System info** (OS, Python version, Node version)

---

## ✅ All Systems Go!

Once all tests pass and verification is complete, your SkillBridge Agent is production-ready! 🚀
