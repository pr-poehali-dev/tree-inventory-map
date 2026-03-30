"""API для управления живыми изгородями (линейные объекты) — CRUD."""

import hashlib
import hmac
import json
import os
import uuid
from datetime import date

import psycopg2
import psycopg2.extras

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Auth-Token",
}

SCHEMA = "t_p59085732_tree_inventory_map"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=psycopg2.extras.RealDictCursor)


def verify_token(token: str):
    secret = os.environ.get("SECRET_KEY", "tree-inventory-salt")
    try:
        parts = token.rsplit(":", 1)
        if len(parts) != 2:
            return None
        payload, sig = parts
        expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        uid_str, email = payload.split(":", 1)
        return {"id": int(uid_str), "email": email}
    except Exception:
        return None


def get_user_from_event(event: dict):
    headers = event.get("headers", {})
    auth = (
        headers.get("X-Authorization") or
        headers.get("X-Auth-Token") or
        headers.get("Authorization") or
        headers.get("authorization") or ""
    )
    token = auth.replace("Bearer ", "").strip()
    if not token:
        return None, None
    info = verify_token(token)
    if not info:
        return None, None
    conn = psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=psycopg2.extras.RealDictCursor)
    cur = conn.cursor()
    cur.execute(f"SELECT id, name FROM {SCHEMA}.users WHERE id = %s", (info["id"],))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if row:
        return row["id"], row["name"]
    return info["id"], info["email"]


def fmt(row):
    d = dict(row)
    points = d["points"]
    if isinstance(points, str):
        points = json.loads(points)
    return {
        "id": d["id"],
        "number": d["number"],
        "name": d["name"],
        "points": points,
        "lengthM": float(d["length_m"]) if d["length_m"] is not None else None,
        "species": d["species"],
        "status": d["status"],
        "condition": d["condition"],
        "address": d.get("address"),
        "description": d.get("description"),
        "createdAt": str(d["created_at"]),
        "updatedAt": str(d["updated_at"]),
        "createdById": d.get("created_by_id"),
        "createdByName": d.get("created_by_name"),
    }


def handler(event: dict, context) -> dict:
    """Обрабатывает CRUD-запросы для живых изгородей."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    row_id = params.get("id")

    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == "GET":
            if row_id:
                cur.execute(f"SELECT * FROM {SCHEMA}.hedgerows WHERE id = %s", (row_id,))
                row = cur.fetchone()
                if not row:
                    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Not found"})}
                return {"statusCode": 200, "headers": CORS, "body": json.dumps(fmt(row))}
            cur.execute(f"SELECT * FROM {SCHEMA}.hedgerows ORDER BY number ASC")
            rows = cur.fetchall()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps([fmt(r) for r in rows])}

        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            new_id = str(uuid.uuid4())
            today = date.today().isoformat()
            user_id, user_name = get_user_from_event(event)
            cur.execute(f"SELECT COALESCE(MAX(number), 0) + 1 AS next_num FROM {SCHEMA}.hedgerows")
            next_num = cur.fetchone()["next_num"]
            points_json = json.dumps(body.get("points", []))
            cur.execute(
                f"""INSERT INTO {SCHEMA}.hedgerows
                   (id, number, name, points, length_m, species, status, condition,
                    address, description, created_at, updated_at, created_by_id, created_by_name)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (
                    new_id, next_num,
                    body.get("name", "Живая изгородь"),
                    points_json,
                    body.get("lengthM"),
                    body.get("species", "Живая изгородь"),
                    body.get("status", "good"),
                    body.get("condition", "healthy"),
                    body.get("address"),
                    body.get("description"),
                    today, today,
                    user_id, user_name,
                ),
            )
            conn.commit()
            cur.execute(f"SELECT * FROM {SCHEMA}.hedgerows WHERE id = %s", (new_id,))
            return {"statusCode": 201, "headers": CORS, "body": json.dumps(fmt(cur.fetchone()))}

        if method == "PUT":
            if not row_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id required"})}
            body = json.loads(event.get("body") or "{}")
            today = date.today().isoformat()
            points_json = json.dumps(body.get("points", []))
            cur.execute(
                f"""UPDATE {SCHEMA}.hedgerows SET
                   name=%s, points=%s, length_m=%s, species=%s, status=%s, condition=%s,
                   address=%s, description=%s, updated_at=%s
                   WHERE id=%s""",
                (
                    body.get("name", "Живая изгородь"),
                    points_json,
                    body.get("lengthM"),
                    body.get("species", "Живая изгородь"),
                    body.get("status", "good"),
                    body.get("condition", "healthy"),
                    body.get("address"),
                    body.get("description"),
                    today, row_id,
                ),
            )
            conn.commit()
            cur.execute(f"SELECT * FROM {SCHEMA}.hedgerows WHERE id = %s", (row_id,))
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Not found"})}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps(fmt(row))}

        if method == "DELETE":
            if not row_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id required"})}
            cur.execute(f"DELETE FROM {SCHEMA}.hedgerows WHERE id = %s", (row_id,))
            cur.execute(f"""
                WITH ranked AS (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY number ASC) AS new_num
                    FROM {SCHEMA}.hedgerows
                )
                UPDATE {SCHEMA}.hedgerows h SET number = r.new_num
                FROM ranked r WHERE h.id = r.id
            """)
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}

    finally:
        cur.close()
        conn.close()
