from typing import Optional
from fastapi import Request
from app.core.config import settings

def get_client_ip(request: Request) -> str:
    """
    Safely resolves client IP address.
    Trusts X-Forwarded-For ONLY if direct client is in TRUSTED_PROXY_IPS.
    """
    direct_ip = request.client.host if request.client else "127.0.0.1"
    trusted_proxies = settings.get_trusted_proxies()

    if direct_ip in trusted_proxies:
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Client IP is the leftmost entry in X-Forwarded-For chain
            parts = [p.strip() for p in forwarded_for.split(",")]
            if parts:
                return parts[0]
    return direct_ip
