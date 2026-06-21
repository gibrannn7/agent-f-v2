import os
import redis.asyncio as aioredis
from typing import Optional

# Setup connection pool following docs-redis.txt
# Vendor: Redis Cloud Managed Service
# Eviction: volatile-lru
redis_pool = aioredis.ConnectionPool(
    host='bridge-key-silica-31501.db.redis.io',
    port=12007,
    username='default',
    password=os.getenv('REDIS_PASSWORD'),
    decode_responses=True
)

async def get_redis_client() -> aioredis.Redis:
    return aioredis.Redis(connection_pool=redis_pool)
