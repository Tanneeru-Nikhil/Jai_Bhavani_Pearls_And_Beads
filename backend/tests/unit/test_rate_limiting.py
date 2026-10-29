import pytest
from app.services.rate_limit_service import RateLimitService
from app.core.redis import get_redis_client

def test_cooldown_and_rate_limiting():
    r = get_redis_client()
    r.flushall()
    test_phone = "+919999900001"
    test_ip = "192.168.1.100"

    # Cooldown initially allowed
    allowed, cd = RateLimitService.check_resend_cooldown(test_phone)
    assert allowed is True
    assert cd == 0

    # Phone rate limit (max 3 per 15 min in config)
    for i in range(3):
        allowed, retry = RateLimitService.check_phone_rate_limit(test_phone)
        assert allowed is True

    # 4th request must be rejected
    allowed, retry = RateLimitService.check_phone_rate_limit(test_phone)
    assert allowed is False
    assert retry > 0

    # IP rate limit (max 10 per 15 min)
    for _ in range(10):
        allowed, retry = RateLimitService.check_ip_rate_limit(test_ip)
        assert allowed is True

    # 11th request must be rejected
    allowed, retry = RateLimitService.check_ip_rate_limit(test_ip)
    assert allowed is False
    assert retry > 0
