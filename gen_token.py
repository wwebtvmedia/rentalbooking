import jwt
import os
import sys

def generate_token(secret):
    payload = {
        "sub": "remote-verify-bot",
        "name": "Remote Verify Bot",
        "email": "verify-bot@bestflats.vip",
        "roles": ["admin"]
    }
    return jwt.encode(payload, secret, algorithm="HS256")

if __name__ == "__main__":
    secret = sys.argv[1] if len(sys.argv) > 1 else os.getenv("AUTH_JWT_SECRET")
    if not secret:
        print("Missing secret")
        sys.exit(1)
    print(generate_token(secret))
