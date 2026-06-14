import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from backend import agent, auth, db

ROOT = Path(__file__).resolve().parent.parent
STATIC_ROOT = ROOT
PORT = 5173


def json_response(handler, payload, status=200):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def read_json(handler):
    length = int(handler.headers.get("Content-Length", "0"))
    if length == 0:
        return {}
    return json.loads(handler.rfile.read(length).decode("utf-8"))


class SkillBridgeHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            return json_response(self, {"ok": True, "service": "skillbridge"})
        if parsed.path == "/api/me":
            user = self.current_user()
            return json_response(self, {"user": user}, 200 if user else 401)
        if parsed.path == "/api/cases":
            user = self.require_user()
            if not user:
                return
            return json_response(self, {"cases": db.list_cases(user["id"])})
        return self.serve_static(parsed.path)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/auth/login":
            payload = read_json(self)
            result = auth.login(payload.get("email", ""), payload.get("password", ""))
            if not result:
                return json_response(self, {"error": "Invalid email or password"}, 401)
            return json_response(self, result)
        if parsed.path == "/api/auth/demo":
            return json_response(self, auth.demo_login())
        if parsed.path == "/api/analyze":
            user = self.require_user()
            if not user:
                return
            payload = read_json(self)
            analysis = agent.analyze_worker(payload)
            case_id = db.save_case(
                user["id"],
                payload.get("workerName") or "Unnamed worker",
                payload.get("notes") or "",
                payload.get("urgency") or "lost-job",
                payload.get("selected") or [],
                analysis,
            )
            return json_response(self, {"caseId": case_id, "analysis": analysis})
        return json_response(self, {"error": "Not found"}, 404)

    def current_user(self):
        header = self.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return None
        return db.get_session_user(header.replace("Bearer ", "", 1).strip())

    def require_user(self):
        user = self.current_user()
        if not user:
            json_response(self, {"error": "Authentication required"}, 401)
            return None
        return user

    def serve_static(self, request_path):
        clean_path = request_path.lstrip("/") or "index.html"
        path = (STATIC_ROOT / clean_path).resolve()
        if not str(path).startswith(str(STATIC_ROOT.resolve())) or not path.exists() or path.is_dir():
            path = STATIC_ROOT / "index.html"
        content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        body = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        return


def run():
    db.init_db()
    auth.ensure_demo_user()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), SkillBridgeHandler)
    print(f"SkillBridge running at http://localhost:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    run()
