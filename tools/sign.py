import time, uuid, hashlib, hmac, sys, json
from urllib.parse import urlparse

def sha256_hex(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def sign(api_secret_hex: str, ts: int, nonce: str, method: str, path: str, body: bytes) -> str:
    msg = f"{ts}.{nonce}.{method.upper()}.{path}.{sha256_hex(body)}".encode()
    key = bytes.fromhex(api_secret_hex)
    return hmac.new(key, msg, hashlib.sha256).hexdigest()

# Usage:
# python tools/sign.py <API_SECRET_HEX> <METHOD> <URL_PATH> <JSON_BODY_OR_EMPTY>
if __name__ == "__main__":
    api_secret_hex = sys.argv[1]
    method = sys.argv[2]
    path = sys.argv[3]
    body_raw = sys.argv[4] if len(sys.argv) > 4 else ""
    body = body_raw.encode("utf-8")

    ts = int(time.time())
    nonce = str(uuid.uuid4())
    signature = sign(api_secret_hex, ts, nonce, method, path, body)

    print(json.dumps({
        "X-Timestamp": ts,
        "X-Nonce": nonce,
        "X-Signature": signature
    }, indent=2))
