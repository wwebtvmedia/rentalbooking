import jwt
import os
import sys
import time

def generate_token(secret, ttl=3600, roles=None):
    now = int(time.time())
    payload = {
        "sub": "remote-verify-bot",
        "name": "Remote Verify Bot",
        "email": "verify-bot@bestflats.vip",
        "roles": roles or ["admin"],
        "iat": now,
        "exp": now + int(ttl),  # short-lived by default so a pasted token can't be reused
    }
    return jwt.encode(payload, secret, algorithm="HS256")

if __name__ == "__main__":
    # Usage: gen_token.py <secret> [ttl_seconds] [roles_csv]
    #   secret    : signing secret (or env AUTH_JWT_SECRET)
    #   ttl       : token lifetime in seconds (default 3600 = 1h; or env GEN_TOKEN_TTL)
    #   roles_csv : comma-separated roles (default "admin"; admin can access everything)
    secret = sys.argv[1] if len(sys.argv) > 1 else os.getenv("AUTH_JWT_SECRET")
    if not secret:
        print("Usage: gen_token.py <secret|env AUTH_JWT_SECRET> [ttl_seconds] [roles_csv]", file=sys.stderr)
        sys.exit(1)
    ttl = sys.argv[2] if len(sys.argv) > 2 else os.getenv("GEN_TOKEN_TTL", "3600")
    roles = sys.argv[3].split(",") if len(sys.argv) > 3 else None
    print(generate_token(secret, ttl=ttl, roles=roles))
