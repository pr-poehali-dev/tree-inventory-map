"""Прокси для тайлов Публичной кадастровой карты Росреестра (pkk.rosreestr.ru) с кэшем в S3."""
import base64
import math
import os
import ssl
import urllib.request
import urllib.parse
import boto3
from botocore.exceptions import ClientError

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=86400',
}

SERVICES = {
    'land':   'PKK6/CadastreObjects/MapServer',
    'oks':    'PKK6/CadastreObjects/MapServer',
    'nature': 'PKK6/ProtectedObjects/MapServer',
    'zouit':  'PKK6/ZONES/MapServer',
}

LAYER_IDS = {
    'land':   'show:30,27,24,23,22,21,20,17,8,0',
    'oks':    'show:40,38,36,35,34,33,32,31',
    'nature': 'show:6,5,4,3,2,1,0',
    'zouit':  'show:16,15,14,13,12,11,10',
}

def get_s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )

def tile_to_bbox_3857(z, x, y):
    n = 2 ** z
    lon1 = x / n * 360 - 180
    lon2 = (x + 1) / n * 360 - 180
    lat1 = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    lat2 = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n))))
    def to_m_x(lon): return lon * 20037508.34 / 180
    def to_m_y(lat): return math.log(math.tan((90 + lat) * math.pi / 360)) / (math.pi / 180) * 20037508.34 / 180
    return to_m_x(lon1), to_m_y(lat2), to_m_x(lon2), to_m_y(lat1)


def handler(event: dict, context) -> dict:
    """Проксирует тайлы кадастровой карты Росреестра с кэшированием в S3."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    layer = params.get('layer', 'land')
    try:
        z = int(params.get('z', 14))
        x = int(params.get('x', 0))
        y = int(params.get('y', 0))
    except ValueError:
        return {'statusCode': 400, 'headers': CORS, 'body': 'bad params'}

    cache_key = f'pkk-tiles/{layer}/{z}/{x}/{y}.png'

    # Проверяем кэш в S3
    try:
        s3 = get_s3()
        obj = s3.get_object(Bucket='files', Key=cache_key)
        data = obj['Body'].read()
        encoded = base64.b64encode(data).decode('utf-8')
        return {
            'statusCode': 200,
            'headers': {**CORS, 'Content-Type': 'image/png'},
            'body': encoded,
            'isBase64Encoded': True,
        }
    except ClientError:
        pass  # Не в кэше — идём к Росреестру
    except Exception:
        pass

    # Запрашиваем у Росреестра
    xmin, ymin, xmax, ymax = tile_to_bbox_3857(z, x, y)
    bbox = f'{xmin},{ymin},{xmax},{ymax}'
    service = SERVICES.get(layer, SERVICES['land'])
    layers = LAYER_IDS.get(layer, LAYER_IDS['land'])

    qs = urllib.parse.urlencode({
        'layers': layers,
        'bbox': bbox,
        'bboxSR': '102100',
        'imageSR': '102100',
        'size': '256,256',
        'dpi': '96',
        'format': 'png32',
        'transparent': 'true',
        'f': 'image',
    })

    url = f'https://pkk.rosreestr.ru/arcgis/rest/services/{service}/export?{qs}'
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://pkk.rosreestr.ru/',
        'Accept': 'image/png,image/*,*/*',
    })

    try:
        with urllib.request.urlopen(req, timeout=20, context=SSL_CTX) as resp:
            data = resp.read()
            if not data or len(data) < 100:
                return {'statusCode': 204, 'headers': CORS, 'body': ''}

            # Сохраняем в S3-кэш
            try:
                s3.put_object(Bucket='files', Key=cache_key, Body=data, ContentType='image/png')
            except Exception:
                pass

            encoded = base64.b64encode(data).decode('utf-8')
            return {
                'statusCode': 200,
                'headers': {**CORS, 'Content-Type': 'image/png'},
                'body': encoded,
                'isBase64Encoded': True,
            }
    except urllib.error.HTTPError as e:
        return {'statusCode': e.code, 'headers': CORS, 'body': ''}
    except Exception as ex:
        return {'statusCode': 502, 'headers': CORS, 'body': str(ex)}
