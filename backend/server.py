import json
import logging
import mimetypes
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from backend import agent, auth, db, config

# Get logger from config
logger = config.logger

ROOT = Path(__file__).resolve().parent.parent
STATIC_ROOT = ROOT
PORT = config.PORT
HOST = config.HOST
CORS_ORIGIN = config.CORS_ORIGIN
DEBUG = config.DEBUG


def add_cors_headers(handler):
    """Add CORS headers to response"""
    handler.send_header("Access-Control-Allow-Origin", CORS_ORIGIN)
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
    handler.send_header("Access-Control-Max-Age", "3600")


def add_security_headers(handler):
    """Add security headers to response"""
    handler.send_header("X-Content-Type-Options", "nosniff")
    handler.send_header("X-Frame-Options", "SAMEORIGIN")
    handler.send_header("X-XSS-Protection", "1; mode=block")
    handler.send_header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    handler.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' cdn.tailwindcss.com")


def json_response(handler, payload, status=200):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    add_cors_headers(handler)
    add_security_headers(handler)
    handler.end_headers()
    handler.wfile.write(body)


def read_json(handler):
    length = int(handler.headers.get("Content-Length", "0"))
    if length == 0:
        return {}
    try:
        return json.loads(handler.rfile.read(length).decode("utf-8"))
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning(f"Invalid JSON received: {e}")
        return {}


class SkillBridgeHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        add_cors_headers(self)
        add_security_headers(self)
        self.end_headers()

    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            
            if parsed.path == "/api/health":
                return json_response(self, {
                    "ok": True,
                    "service": "skillbridge",
                    "version": "1.0.0",
                    "environment": config.ENVIRONMENT
                })
            
            if parsed.path == "/api/me":
                user = self.current_user()
                return json_response(self, {"user": user}, 200 if user else 401)
            
            if parsed.path == "/api/cases":
                user = self.require_user()
                if not user:
                    return
                cases = db.list_cases(user["id"])
                logger.info(f"User {user['id']} retrieved {len(cases)} cases")
                return json_response(self, {"cases": cases})
            
            return self.serve_static(parsed.path)
        
        except Exception as e:
            logger.error(f"Error in GET {self.path}: {e}\n{traceback.format_exc()}")
            return json_response(self, {"error": "Internal server error"}, 500)

    def do_POST(self):
        try:
            parsed = urlparse(self.path)
            
            if parsed.path == "/api/auth/login":
                payload = read_json(self)
                result = auth.login(payload.get("email", ""), payload.get("password", ""))
                if not result:
                    logger.warning(f"Failed login attempt for {payload.get('email', 'unknown')}")
                    return json_response(self, {"error": "Invalid email or password"}, 401)
                logger.info(f"User {result['user']['email']} logged in successfully")
                return json_response(self, result)
            
            if parsed.path == "/api/auth/demo":
                result = auth.demo_login()
                logger.info("Demo login used")
                return json_response(self, result)
            
            if parsed.path == "/api/analyze":
                user = self.require_user()
                if not user:
                    return
                
                payload = read_json(self)
                logger.info(f"Analyzing worker profile for user {user['id']}")
                
                analysis = agent.analyze_worker(payload)
                case_id = db.save_case(
                    user["id"],
                    payload.get("workerName") or "Unnamed worker",
                    payload.get("notes") or "",
                    payload.get("urgency") or "lost-job",
                    payload.get("selected") or [],
                    analysis,
                )
                
                logger.info(f"Case {case_id} created for user {user['id']}")
                return json_response(self, {"caseId": case_id, "analysis": analysis})
            
            logger.warning(f"Unknown endpoint: {parsed.path}")
            return json_response(self, {"error": "Not found"}, 404)
        
        except Exception as e:
            logger.error(f"Error in POST {self.path}: {e}\n{traceback.format_exc()}")
            return json_response(self, {"error": "Internal server error"}, 500)

    def current_user(self):
        header = self.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return None
        token = header.replace("Bearer ", "", 1).strip()
        user = db.get_session_user(token)
        return user

    def require_user(self):
        user = self.current_user()
        if not user:
            logger.warning(f"Unauthorized access attempt from {self.client_address[0]}")
            json_response(self, {"error": "Authentication required"}, 401)
            return None
        return user

    def serve_static(self, request_path):
        try:
            clean_path = request_path.lstrip("/") or "index.html"
            path = (STATIC_ROOT / clean_path).resolve()
            
            # Security check: prevent directory traversal
            if not str(path).startswith(str(STATIC_ROOT.resolve())) or not path.exists() or path.is_dir():
                path = STATIC_ROOT / "index.html"
            
            content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
            body = path.read_bytes()
            
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "public, max-age=3600")
            add_cors_headers(self)
            add_security_headers(self)
            self.end_headers()
            self.wfile.write(body)
        
        except Exception as e:
            logger.error(f"Error serving static {request_path}: {e}")
            json_response(self, {"error": "Not found"}, 404)

    def log_message(self, format, *args):
        """Override default logging to use our logger"""
        if DEBUG:
            logger.debug(f"{self.client_address[0]} - {format % args}")


def run():
    """Start the SkillBridge server"""
    try:
        logger.info("=" * 60)
        logger.info("SkillBridge Agent Starting")
        logger.info("=" * 60)
        logger.info(f"Environment: {config.ENVIRONMENT}")
        logger.info(f"Debug Mode: {DEBUG}")
        logger.info(f"Server: {HOST}:{PORT}")
        logger.info(f"CORS Origin: {CORS_ORIGIN}")
        logger.info(f"Database: {config.SKILLBRIDGE_DB}")
        
        # Initialize database
        logger.info("Initializing database...")
        db.init_db()
        auth.ensure_demo_user()
        logger.info("Database initialized successfully")
        
        # Start server
        logger.info(f"Starting HTTP server on {HOST}:{PORT}")
        server = ThreadingHTTPServer((HOST, PORT), SkillBridgeHandler)
        logger.info(f"✓ SkillBridge running at http://{HOST}:{PORT}")
        logger.info("=" * 60)
        
        server.serve_forever()
    
    except KeyboardInterrupt:
        logger.info("Shutdown signal received")
        server.shutdown()
    except Exception as e:
        logger.critical(f"Failed to start server: {e}\n{traceback.format_exc()}")
        raise


if __name__ == "__main__":
    run()
