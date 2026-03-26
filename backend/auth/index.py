"""Аутентификация: регистрация и вход пользователей."""
import json
import os
import hashlib
import hmac
import secrets
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
}

SCHEMA = 't_p59085732_tree_inventory_map'

def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(password: str) -> str:
    salt = os.environ.get('SECRET_KEY', 'tree-inventory-salt')
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()

def make_token(user_id: int, email: str) -> str:
    secret = os.environ.get('SECRET_KEY', 'tree-inventory-salt')
    payload = f"{user_id}:{email}"
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}:{sig}"

def verify_token(token: str):
    secret = os.environ.get('SECRET_KEY', 'tree-inventory-salt')
    try:
        parts = token.rsplit(':', 1)
        if len(parts) != 2:
            return None
        payload, sig = parts
        expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        uid_str, email = payload.split(':', 1)
        return {'id': int(uid_str), 'email': email}
    except Exception:
        return None

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except Exception:
            pass

    action = body.get('action', '')
    if not action:
        if path.endswith('/register'): action = 'register'
        elif path.endswith('/login'): action = 'login'
        elif path.endswith('/me'): action = 'me'

    # POST register
    if method == 'POST' and action == 'register':
        email = (body.get('email') or '').strip().lower()
        password = body.get('password') or ''
        name = (body.get('name') or '').strip()

        if not email or not password or not name:
            return {'statusCode': 400, 'headers': CORS,
                    'body': json.dumps({'error': 'Заполните все поля'})}
        if len(password) < 6:
            return {'statusCode': 400, 'headers': CORS,
                    'body': json.dumps({'error': 'Пароль должен быть не менее 6 символов'})}

        conn = get_db()
        cur = conn.cursor()
        cur.execute(f'SELECT id FROM {SCHEMA}.users WHERE email = %s', (email,))
        if cur.fetchone():
            conn.close()
            return {'statusCode': 409, 'headers': CORS,
                    'body': json.dumps({'error': 'Пользователь с таким email уже существует'})}

        pw_hash = hash_password(password)
        cur.execute(
            f'INSERT INTO {SCHEMA}.users (email, password_hash, name) VALUES (%s, %s, %s) RETURNING id',
            (email, pw_hash, name)
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        conn.close()

        token = make_token(user_id, email)
        return {'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'token': token, 'user': {'id': user_id, 'email': email, 'name': name, 'role': 'user'}})}

    # POST login
    if method == 'POST' and action == 'login':
        email = (body.get('email') or '').strip().lower()
        password = body.get('password') or ''

        if not email or not password:
            return {'statusCode': 400, 'headers': CORS,
                    'body': json.dumps({'error': 'Введите email и пароль'})}

        pw_hash = hash_password(password)
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f'SELECT id, email, name, role FROM {SCHEMA}.users WHERE email = %s AND password_hash = %s',
            (email, pw_hash)
        )
        row = cur.fetchone()
        conn.close()

        if not row:
            return {'statusCode': 401, 'headers': CORS,
                    'body': json.dumps({'error': 'Неверный email или пароль'})}

        user_id, user_email, name, role = row
        token = make_token(user_id, user_email)
        return {'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'token': token, 'user': {'id': user_id, 'email': user_email, 'name': name, 'role': role}})}

    # POST me
    if method == 'POST' and action == 'me':
        token = body.get('token') or ''
        info = verify_token(token)
        if not info:
            return {'statusCode': 401, 'headers': CORS,
                    'body': json.dumps({'error': 'Токен недействителен'})}

        conn = get_db()
        cur = conn.cursor()
        cur.execute(f'SELECT id, email, name, role FROM {SCHEMA}.users WHERE id = %s', (info['id'],))
        row = cur.fetchone()
        conn.close()

        if not row:
            return {'statusCode': 401, 'headers': CORS,
                    'body': json.dumps({'error': 'Пользователь не найден'})}

        user_id, email, name, role = row
        return {'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'user': {'id': user_id, 'email': email, 'name': name, 'role': role}})}

    # POST list_users (только для admin)
    if method == 'POST' and action == 'list_users':
        token = body.get('token') or ''
        info = verify_token(token)
        if not info:
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}

        conn = get_db()
        cur = conn.cursor()
        cur.execute(f'SELECT role FROM {SCHEMA}.users WHERE id = %s', (info['id'],))
        row = cur.fetchone()
        if not row or row[0] != 'admin':
            conn.close()
            return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Доступ запрещён'})}

        cur.execute(f'SELECT id, email, name, role, created_at FROM {SCHEMA}.users ORDER BY created_at')
        users = [{'id': r[0], 'email': r[1], 'name': r[2], 'role': r[3], 'created_at': str(r[4])} for r in cur.fetchall()]
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'users': users})}

    # POST set_role (только для admin)
    if method == 'POST' and action == 'set_role':
        token = body.get('token') or ''
        info = verify_token(token)
        if not info:
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}

        target_id = body.get('user_id')
        new_role = body.get('role')
        if not target_id or new_role not in ('user', 'editor', 'admin'):
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Неверные параметры'})}

        conn = get_db()
        cur = conn.cursor()
        cur.execute(f'SELECT role FROM {SCHEMA}.users WHERE id = %s', (info['id'],))
        row = cur.fetchone()
        if not row or row[0] != 'admin':
            conn.close()
            return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Доступ запрещён'})}

        if target_id == info['id']:
            conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нельзя изменить свою роль'})}

        cur.execute(f'UPDATE {SCHEMA}.users SET role = %s WHERE id = %s', (new_role, target_id))
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}