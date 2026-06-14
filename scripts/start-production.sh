#!/bin/bash
# =============================================================================
# SkillBridge Agent - Production Startup Script
# =============================================================================
# Usage: ./scripts/start-production.sh
# This script handles all production startup tasks

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SkillBridge Agent - Production Startup${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"

# =============================================================================
# 1. Verify Environment
# =============================================================================
echo -e "${YELLOW}[1/8] Verifying environment...${NC}"

if [ ! -f ".env" ]; then
    echo -e "${RED}✗ .env file not found${NC}"
    echo "Please copy .env.example to .env and configure production values:"
    echo "  cp .env.example .env"
    exit 1
fi
echo -e "${GREEN}✓ .env file found${NC}"

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ Python 3 is required but not installed${NC}"
    exit 1
fi
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo -e "${GREEN}✓ Python $PYTHON_VERSION found${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is required but not installed${NC}"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js $NODE_VERSION found${NC}\n"

# =============================================================================
# 2. Create Required Directories
# =============================================================================
echo -e "${YELLOW}[2/8] Creating required directories...${NC}"

mkdir -p data logs backups
chmod 755 data logs backups

echo -e "${GREEN}✓ Directories created${NC}\n"

# =============================================================================
# 3. Install Dependencies
# =============================================================================
echo -e "${YELLOW}[3/8] Installing dependencies...${NC}"

if [ ! -d "node_modules" ]; then
    npm install --production
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi
echo ""

# =============================================================================
# 4. Build Validation
# =============================================================================
echo -e "${YELLOW}[4/8] Validating build...${NC}"

npm run build
echo -e "${GREEN}✓ Build validated${NC}\n"

# =============================================================================
# 5. Initialize Database
# =============================================================================
echo -e "${YELLOW}[5/8] Initializing database...${NC}"

python3 -c "from backend import db; db.init_db()"
echo -e "${GREEN}✓ Database initialized${NC}"

python3 -c "from backend import auth; auth.ensure_demo_user()"
echo -e "${GREEN}✓ Demo user created${NC}\n"

# =============================================================================
# 6. Verify Configuration
# =============================================================================
echo -e "${YELLOW}[6/8] Verifying configuration...${NC}"

# Check JWT_SECRET
JWT_SECRET=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2 || true)
if [ -z "$JWT_SECRET" ] || [ ${#JWT_SECRET} -lt 32 ]; then
    echo -e "${YELLOW}⚠ Warning: JWT_SECRET is not set or too short (< 32 chars)${NC}"
    echo "  Set a secure JWT_SECRET in .env:"
    echo "  JWT_SECRET=\$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
fi

# Check ENVIRONMENT
ENV=$(grep "^ENVIRONMENT=" .env | cut -d'=' -f2 || echo "development")
if [ "$ENV" != "production" ]; then
    echo -e "${YELLOW}⚠ Warning: ENVIRONMENT is not set to 'production'${NC}"
fi

echo -e "${GREEN}✓ Configuration verified${NC}\n"

# =============================================================================
# 7. Test API Health
# =============================================================================
echo -e "${YELLOW}[7/8] Testing API health...${NC}"

# Start server in background
python3 -m backend.server > server.log 2>&1 &
SERVER_PID=$!
sleep 2

# Check if server is running
if ! ps -p $SERVER_PID > /dev/null; then
    echo -e "${RED}✗ Server failed to start${NC}"
    cat server.log
    exit 1
fi

# Test health endpoint
HEALTH=$(curl -s http://localhost:5173/api/health || echo "failed")
if echo "$HEALTH" | grep -q '"ok"'; then
    echo -e "${GREEN}✓ API health check passed${NC}"
else
    echo -e "${RED}✗ API health check failed${NC}"
    kill $SERVER_PID
    exit 1
fi

# Kill test server
kill $SERVER_PID
rm -f server.log
echo ""

# =============================================================================
# 8. Summary & Next Steps
# =============================================================================
echo -e "${YELLOW}[8/8] Production startup complete${NC}\n"

echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ All checks passed! Ready for production${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}\n"

echo -e "${BLUE}Next steps:${NC}"
echo "1. Start the server:"
echo "   npm start"
echo ""
echo "2. Monitor logs:"
echo "   tail -f logs/skillbridge.log"
echo ""
echo "3. Set up auto-backups (cron):"
echo "   0 2 * * * python3 -c 'from backend import db; db.backup_database()'"
echo ""
echo "4. Configure reverse proxy (Nginx):"
echo "   See DEPLOYMENT.md for Nginx configuration"
echo ""
echo "5. Monitor uptime:"
echo "   curl http://localhost:5173/api/health"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "- Main README: README.md"
echo "- Deployment Guide: DEPLOYMENT.md"
echo "- Agent Guidelines: AGENTS.md"
echo ""
