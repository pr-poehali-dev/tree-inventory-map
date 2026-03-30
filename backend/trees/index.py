"""API для управления деревьями в дендрологической ведомости (CRUD)."""

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
SELECT_COLS = "number,id,lat,lng,name,species,diameter,height,count,age,status,condition,life_status,address,description,photo_url,created_at,updated_at,created_by_id,created_by_name"


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
    """Возвращает (user_id, user_name) из токена авторизации, или (None, None)."""
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
    return {
        "number": d["number"],
        "id": d["id"],
        "lat": float(d["lat"]),
        "lng": float(d["lng"]),
        "name": d["name"],
        "species": d["species"],
        "diameter": d["diameter"],
        "height": float(d["height"]),
        "count": d["count"],
        "age": d["age"],
        "status": d["status"],
        "condition": d["condition"],
        "lifeStatus": d["life_status"],
        "address": d.get("address"),
        "description": d["description"],
        "photoUrl": d["photo_url"],
        "createdAt": d["created_at"],
        "updatedAt": d["updated_at"],
        "createdById": d.get("created_by_id"),
        "createdByName": d.get("created_by_name"),
    }


def handler(event: dict, context) -> dict:
    """Обрабатывает CRUD-запросы для деревьев."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    tree_id = params.get("id")

    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == "GET":
            if tree_id:
                cur.execute(f"SELECT {SELECT_COLS} FROM {SCHEMA}.trees WHERE id = %s", (tree_id,))
                row = cur.fetchone()
                if not row:
                    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Not found"})}
                return {"statusCode": 200, "headers": CORS, "body": json.dumps(fmt(row))}
            cur.execute(f"SELECT {SELECT_COLS} FROM {SCHEMA}.trees ORDER BY number ASC")
            rows = cur.fetchall()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps([fmt(r) for r in rows])}

        if method == "POST":
            raw = json.loads(event.get("body") or "{}")
            today = date.today().isoformat()
            user_id, user_name = get_user_from_event(event)

            # Bulk-вставка: если тело — массив объектов
            if isinstance(raw, list):
                if not raw:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "empty array"})}
                cur.execute(f"SELECT COALESCE(MAX(number), 0) AS max_num FROM {SCHEMA}.trees")
                start_num = cur.fetchone()["max_num"]
                new_ids = []
                for i, item in enumerate(raw):
                    new_id = str(uuid.uuid4())
                    new_ids.append(new_id)
                    cur.execute(
                        f"""INSERT INTO {SCHEMA}.trees
                           (id,number,lat,lng,name,species,diameter,height,count,age,
                            status,condition,life_status,address,description,photo_url,created_at,updated_at,
                            created_by_id,created_by_name)
                           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                        (
                            new_id, start_num + i + 1,
                            item["lat"], item["lng"], item["name"], item["species"],
                            item.get("diameter", 20), item.get("height", 8),
                            item.get("count", 1), item.get("age"),
                            item.get("status", "good"), item.get("condition", "healthy"),
                            item.get("lifeStatus", "alive"),
                            item.get("address"), item.get("description"), item.get("photoUrl"),
                            today, today,
                            user_id, user_name,
                        ),
                    )
                conn.commit()
                placeholders = ",".join(["%s"] * len(new_ids))
                cur.execute(f"SELECT {SELECT_COLS} FROM {SCHEMA}.trees WHERE id IN ({placeholders}) ORDER BY number ASC", new_ids)
                return {"statusCode": 201, "headers": CORS, "body": json.dumps([fmt(r) for r in cur.fetchall()])}

            # Одиночная вставка
            body = raw
            new_id = str(uuid.uuid4())
            cur.execute(f"SELECT COALESCE(MAX(number), 0) + 1 AS next_num FROM {SCHEMA}.trees")
            next_num = cur.fetchone()["next_num"]
            cur.execute(
                f"""INSERT INTO {SCHEMA}.trees
                   (id,number,lat,lng,name,species,diameter,height,count,age,
                    status,condition,life_status,address,description,photo_url,created_at,updated_at,
                    created_by_id,created_by_name)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (
                    new_id, next_num,
                    body["lat"], body["lng"], body["name"], body["species"],
                    body.get("diameter", 20), body.get("height", 8),
                    body.get("count", 1), body.get("age"),
                    body.get("status", "good"), body.get("condition", "healthy"),
                    body.get("lifeStatus", "alive"),
                    body.get("address"), body.get("description"), body.get("photoUrl"),
                    today, today,
                    user_id, user_name,
                ),
            )
            conn.commit()
            cur.execute(f"SELECT {SELECT_COLS} FROM {SCHEMA}.trees WHERE id = %s", (new_id,))
            return {"statusCode": 201, "headers": CORS, "body": json.dumps(fmt(cur.fetchone()))}

        if method == "PUT":
            if not tree_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id required"})}
            body = json.loads(event.get("body") or "{}")
            today = date.today().isoformat()
            cur.execute(
                f"""UPDATE {SCHEMA}.trees SET
                   lat=%s,lng=%s,name=%s,species=%s,diameter=%s,height=%s,
                   count=%s,age=%s,status=%s,condition=%s,life_status=%s,
                   address=%s,description=%s,photo_url=%s,updated_at=%s
                   WHERE id=%s""",
                (
                    body["lat"], body["lng"], body["name"], body["species"],
                    body.get("diameter", 20), body.get("height", 8),
                    body.get("count", 1), body.get("age"),
                    body.get("status", "good"), body.get("condition", "healthy"),
                    body.get("lifeStatus", "alive"),
                    body.get("address"), body.get("description"), body.get("photoUrl"),
                    today, tree_id,
                ),
            )
            conn.commit()
            cur.execute(f"SELECT {SELECT_COLS} FROM {SCHEMA}.trees WHERE id = %s", (tree_id,))
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Not found"})}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps(fmt(row))}

        if method == "DELETE":
            if not tree_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id required"})}
            cur.execute(f"DELETE FROM {SCHEMA}.trees WHERE id = %s", (tree_id,))
            cur.execute(f"""
                WITH ranked AS (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY number ASC) AS new_num
                    FROM {SCHEMA}.trees
                )
                UPDATE {SCHEMA}.trees t SET number = r.new_num
                FROM ranked r WHERE t.id = r.id
            """)
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}

    finally:
        cur.close()
        conn.close()