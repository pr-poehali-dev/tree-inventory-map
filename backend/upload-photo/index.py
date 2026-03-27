"""Загружает фото дерева в S3 и возвращает публичный CDN URL."""

import base64
import json
import os
import uuid

import boto3


CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token, Authorization",
}


def handler(event: dict, context) -> dict:
    """Принимает base64-изображение, загружает в S3, возвращает CDN URL."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    data_url = body.get("image", "")

    if not data_url:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "image required"})}

    if "," in data_url:
        header, b64 = data_url.split(",", 1)
        content_type = header.split(":")[1].split(";")[0] if ":" in header else "image/jpeg"
    else:
        b64 = data_url
        content_type = "image/jpeg"

    ext_map = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}
    ext = ext_map.get(content_type, "jpg")

    image_bytes = base64.b64decode(b64)
    key = f"trees/{uuid.uuid4()}.{ext}"

    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    s3.put_object(Bucket="files", Key=key, Body=image_bytes, ContentType=content_type)

    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"url": cdn_url})}
