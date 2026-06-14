"""
SkillBridge Agent - Centralized Configuration Management
Handles all environment variables and settings for deployment
"""

import logging
import os
from pathlib import Path

# Try to load .env file if python-dotenv is available
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    # python-dotenv is optional, continue without it
    pass

# ======================
# Environment & Mode
# ======================
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
DEBUG = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")
IS_PRODUCTION = ENVIRONMENT == "production"

# ======================
# Server Configuration
# ======================
PORT = int(os.getenv("PORT", "5173"))
HOST = os.getenv("HOST", "127.0.0.1" if not IS_PRODUCTION else "0.0.0.0")
SERVER_URL = os.getenv("SERVER_URL", f"http://localhost:{PORT}")

# ======================
# Paths
# ======================
ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
LOGS_DIR = ROOT / os.getenv("LOG_DIR", "logs")

# ======================
# Database Configuration
# ======================
DB_ENV = os.getenv("SKILLBRIDGE_DB", None)
if DB_ENV:
    SKILLBRIDGE_DB = Path(DB_ENV)
else:
    SKILLBRIDGE_DB = DATA_DIR / "skillbridge.db"
DATABASE_BACKUP_DIR = ROOT / os.getenv("DATABASE_BACKUP_DIR", "backups")
DATABASE_TIMEOUT = int(os.getenv("DATABASE_TIMEOUT", "30"))

# ======================
# Security Configuration
# ======================
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-key-not-for-production")
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:5173")
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

# Validate JWT secret in production
if IS_PRODUCTION and len(JWT_SECRET) < 32:
    raise ValueError(
        "CRITICAL: JWT_SECRET must be at least 32 characters in production. "
        "Set JWT_SECRET environment variable."
    )

# ======================
# Authentication
# ======================
SESSION_TIMEOUT_DAYS = int(os.getenv("SESSION_TIMEOUT_DAYS", "7"))
PASSWORD_MIN_LENGTH = int(os.getenv("PASSWORD_MIN_LENGTH", "8"))

# ======================
# Logging Configuration
# ======================
LOG_LEVEL = os.getenv("LOG_LEVEL", "DEBUG" if DEBUG else "INFO").upper()
LOG_FILE = LOGS_DIR / os.getenv("LOG_FILE", "skillbridge.log")
LOG_MAX_SIZE_MB = int(os.getenv("LOG_MAX_SIZE_MB", "10"))
LOG_BACKUP_COUNT = int(os.getenv("LOG_BACKUP_COUNT", "5"))

# ======================
# Feature Flags
# ======================
ENABLE_DEMO_LOGIN = os.getenv("ENABLE_DEMO_LOGIN", "true").lower() in ("true", "1", "yes")
ENABLE_USER_REGISTRATION = os.getenv("ENABLE_USER_REGISTRATION", "true").lower() in ("true", "1", "yes")
MAX_CASES_PER_USER = int(os.getenv("MAX_CASES_PER_USER", "1000"))

# ======================
# Email Configuration (Optional)
# ======================
SMTP_SERVER = os.getenv("SMTP_SERVER", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@example.com")

# ======================
# Initialize Logging
# ======================
def setup_logging():
    """Configure logging for the application"""
    try:
        LOGS_DIR.mkdir(exist_ok=True)
        
        logger = logging.getLogger("skillbridge")
        # Clear any existing handlers
        logger.handlers = []
        logger.setLevel(getattr(logging, LOG_LEVEL))
        
        # Console Handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(getattr(logging, LOG_LEVEL))
        
        # File Handler with rotation
        try:
            from logging.handlers import RotatingFileHandler
            file_handler = RotatingFileHandler(
                LOG_FILE,
                maxBytes=LOG_MAX_SIZE_MB * 1024 * 1024,
                backupCount=LOG_BACKUP_COUNT
            )
            file_handler.setLevel(getattr(logging, LOG_LEVEL))
            logger.addHandler(file_handler)
        except Exception as e:
            print(f"Warning: Could not setup file logging: {e}")
        
        # Formatter
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
        
        return logger
    except Exception as e:
        print(f"Warning: Could not setup logging: {e}")
        # Fallback to basic logging
        logging.basicConfig(level=logging.INFO)
        return logging.getLogger("skillbridge")

logger = setup_logging()

# ======================
# Config Summary
# ======================
if DEBUG or not IS_PRODUCTION:
    logger.info(f"SkillBridge Agent - {ENVIRONMENT.upper()} Mode")
    logger.info(f"Server: {HOST}:{PORT}")
    logger.info(f"Database: {SKILLBRIDGE_DB}")
    logger.info(f"CORS Origin: {CORS_ORIGIN}")
    logger.info(f"Debug Mode: {DEBUG}")
