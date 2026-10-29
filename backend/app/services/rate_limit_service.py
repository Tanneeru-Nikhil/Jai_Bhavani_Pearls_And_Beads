import time
from typing import Tuple, Optional
from app.core.config import settings
from app.core.redis import get_redis_client
from app.services.security_service import SecurityService

class RateLimitService:
    @staticmethod
    def check_resend_cooldown(phone_e164: str) -> Tuple[bool, int]:
        """
        Checks if phone number is within resend cooldown.
        Returns: (is_allowed, remaining_cooldown_seconds)
        """
        r = get_redis_client()
        phone_digest = SecurityService.compute_pseudonym_digest(phone_e164)
        cooldown_key = f"otp:phone_cooldown:{phone_digest}"

        ttl = r.ttl(cooldown_key)
        if ttl > 0:
            return False, ttl
        return True, 0

    @staticmethod
    def check_and_increment_sliding_window(key: str, limit: int, window_seconds: int) -> Tuple[bool, int]:
        """
        Generic distributed sliding window rate limiter using Redis sorted sets (ZSET).
        Returns: (is_allowed, retry_after_seconds)
        """
        r = get_redis_client()
        now = time.time()
        window_start = now - window_seconds

        pipe = r.pipeline()
        # Remove timestamps older than the window
        pipe.zremrangebyscore(key, 0, window_start)
        # Count elements in current window
        pipe.zcard(key)
        results = pipe.execute()
        current_count = results[1]

        if current_count >= limit:
            # Query oldest element to compute accurate retry-after
            oldest = r.zrange(key, 0, 0, withscores=True)
            if oldest:
                oldest_ts = oldest[0][1]
                retry_after = max(1, int(oldest_ts + window_seconds - now))
            else:
                retry_after = window_seconds
            return False, retry_after

        # Record new event timestamp
        pipe = r.pipeline()
        pipe.zadd(key, {f"{now}:{current_count}": now})
        pipe.expire(key, window_seconds + 10)
        pipe.execute()

        return True, 0

    @classmethod
    def check_phone_rate_limit(cls, phone_e164: str) -> Tuple[bool, int]:
        phone_digest = SecurityService.compute_pseudonym_digest(phone_e164)
        key = f"otp:phone_rate:{phone_digest}"
        return cls.check_and_increment_sliding_window(
            key=key,
            limit=settings.RATE_LIMIT_PHONE_MAX,
            window_seconds=settings.RATE_LIMIT_PHONE_WINDOW_SECONDS
        )

    @classmethod
    def check_ip_rate_limit(cls, client_ip: str) -> Tuple[bool, int]:
        ip_digest = SecurityService.compute_pseudonym_digest(client_ip)
        key = f"otp:ip_rate:{ip_digest}"
        return cls.check_and_increment_sliding_window(
            key=key,
            limit=settings.RATE_LIMIT_IP_MAX,
            window_seconds=settings.RATE_LIMIT_IP_WINDOW_SECONDS
        )

    @classmethod
    def check_daily_phone_limit(cls, phone_e164: str) -> Tuple[bool, int]:
        r = get_redis_client()
        phone_digest = SecurityService.compute_pseudonym_digest(phone_e164)
        daily_key = f"otp:daily_rate:{phone_digest}"

        count = r.incr(daily_key)
        if count == 1:
            r.expire(daily_key, 86400)  # 24 hours

        if count > settings.RATE_LIMIT_DAILY_PHONE_MAX:
            ttl = r.ttl(daily_key)
            return False, max(1, ttl)
        return True, 0
