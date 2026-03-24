"""
Redis cache helpers for the DMF platform.

Usage:
    cache = RedisCache()
    await cache.set("dsp:streams:artist_123", data, ttl=300)
    cached = await cache.get("dsp:streams:artist_123")
"""
import json
import os
from typing import Any, Optional

import redis.asyncio as aioredis

REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")
DEFAULT_TTL: int = 300  # 5 minutes


class RedisCache:
    _client: Optional[aioredis.Redis] = None

    @classmethod
    async def client(cls) -> aioredis.Redis:
        if cls._client is None:
            cls._client = await aioredis.from_url(
                REDIS_URL, encoding="utf-8", decode_responses=True
            )
        return cls._client

    @classmethod
    async def get(cls, key: str) -> Optional[Any]:
        r = await cls.client()
        raw = await r.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return raw

    @classmethod
    async def set(cls, key: str, value: Any, ttl: int = DEFAULT_TTL) -> None:
        r = await cls.client()
        await r.set(key, json.dumps(value), ex=ttl)

    @classmethod
    async def delete(cls, key: str) -> None:
        r = await cls.client()
        await r.delete(key)

    @classmethod
    async def invalidate_prefix(cls, prefix: str) -> int:
        """Delete all keys matching prefix:*. Returns count deleted."""
        r = await cls.client()
        keys = await r.keys(f"{prefix}:*")
        if keys:
            return await r.delete(*keys)
        return 0

    @classmethod
    async def close(cls) -> None:
        if cls._client:
            await cls._client.aclose()
            cls._client = None


# Convenience decorators / helpers

def cache_key(*parts: str) -> str:
    """Build a colon-delimited cache key."""
    return ":".join(str(p) for p in parts)
