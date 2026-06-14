import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"

# Get database path from environment or use default
db_env = os.environ.get("SKILLBRIDGE_DB", None)
if db_env:
    DB_PATH = Path(db_env)
else:
    DB_PATH = DATA_DIR / "skillbridge.db"


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def connect():
    DATA_DIR.mkdir(exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with connect() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'counselor',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS cases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                worker_name TEXT NOT NULL,
                notes TEXT NOT NULL,
                urgency TEXT NOT NULL,
                selected TEXT NOT NULL,
                analysis TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
            """
        )


def row_to_user(row):
    if not row:
        return None
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
    }


def create_user(name, email, password_hash, role="counselor"):
    with connect() as connection:
        cursor = connection.execute(
            "INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
            (name, email.lower(), password_hash, role, utc_now()),
        )
        return cursor.lastrowid


def get_user_by_email(email):
    with connect() as connection:
        row = connection.execute("SELECT * FROM users WHERE email = ?", (email.lower(),)).fetchone()
        return dict(row) if row else None


def get_user_by_id(user_id):
    with connect() as connection:
        return row_to_user(connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone())


def save_session(token, user_id, expires_at):
    with connect() as connection:
        connection.execute(
            "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, user_id, utc_now(), expires_at),
        )


def get_session_user(token):
    with connect() as connection:
        row = connection.execute(
            """
            SELECT users.* FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token = ? AND sessions.expires_at > ?
            """,
            (token, utc_now()),
        ).fetchone()
        return row_to_user(row)


def save_case(user_id, worker_name, notes, urgency, selected, analysis):
    with connect() as connection:
        cursor = connection.execute(
            """
            INSERT INTO cases (user_id, worker_name, notes, urgency, selected, analysis, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, worker_name, notes, urgency, json.dumps(selected), json.dumps(analysis), utc_now()),
        )
        return cursor.lastrowid


def list_cases(user_id):
    with connect() as connection:
        rows = connection.execute(
            "SELECT * FROM cases WHERE user_id = ? ORDER BY id DESC LIMIT 20",
            (user_id,),
        ).fetchall()
        return [
            {
                "id": row["id"],
                "worker_name": row["worker_name"],
                "notes": row["notes"],
                "urgency": row["urgency"],
                "selected": json.loads(row["selected"]),
                "analysis": json.loads(row["analysis"]),
                "created_at": row["created_at"],
            }
            for row in rows
        ]
