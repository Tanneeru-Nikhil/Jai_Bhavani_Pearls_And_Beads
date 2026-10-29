import redis
from typing import Optional
from app.core.config import settings

_redis_client: Optional[redis.Redis] = None

def get_redis_client() -> redis.Redis:
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    # In development/test mode without native Redis running, fall back cleanly to fakeredis
    try:
        client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1)
        client.ping()
        _redis_client = client
        return _redis_client
    except Exception:
        if settings.USE_FAKEREDIS_IN_DEV or settings.APP_ENV in ["development", "testing"]:
            import fakeredis
            _redis_client = fakeredis.FakeRedis(decode_responses=True)
            return _redis_client
        raise
