"""API для управления деревьями в дендрологической ведомости (CRUD)."""

import json
import os
import uuid
from datetime import date

import psycopg2
import psycopg2.extras

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

SCHEMA = "t_p59085732_tree_inventory_map"
SELECT_COLS = "number,id,lat,lng,name,species,diameter,height,count,age,status,condition,life_status,description,photo_url,created_at,updated_at"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=psycopg2.extras.RealDictCursor)


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
        "description": d["description"],
        "photoUrl": d["photo_url"],
        "createdAt": d["created_at"],
        "updatedAt": d["updated_at"],
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
            body = json.loads(event.get("body") or "{}")
            new_id = str(uuid.uuid4())
            today = date.today().isoformat()
            cur.execute(
                f"""INSERT INTO {SCHEMA}.trees
                   (id,lat,lng,name,species,diameter,height,count,age,
                    status,condition,life_status,description,photo_url,created_at,updated_at)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (
                    new_id,
                    body["lat"], body["lng"], body["name"], body["species"],
                    body.get("diameter", 20), body.get("height", 8),
                    body.get("count", 1), body.get("age"),
                    body.get("status", "good"), body.get("condition", "healthy"),
                    body.get("lifeStatus", "alive"),
                    body.get("description"), body.get("photoUrl"),
                    today, today,
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
                   description=%s,photo_url=%s,updated_at=%s
                   WHERE id=%s""",
                (
                    body["lat"], body["lng"], body["name"], body["species"],
                    body.get("diameter", 20), body.get("height", 8),
                    body.get("count", 1), body.get("age"),
                    body.get("status", "good"), body.get("condition", "healthy"),
                    body.get("lifeStatus", "alive"),
                    body.get("description"), body.get("photoUrl"),
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
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}

    finally:
        cur.close()
        conn.close()