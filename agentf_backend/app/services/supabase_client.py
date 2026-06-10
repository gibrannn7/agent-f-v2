from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from app.core.config import settings
from typing import Dict, Any, List

db_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://") if settings.DATABASE_URL else "postgresql+asyncpg://user:pass@localhost/db"

engine = create_async_engine(db_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_tenant_mappings(tenant_id: str) -> List[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("SELECT * FROM public.standard_mappings WHERE tenant_id = :tenant_id"),
            {"tenant_id": tenant_id}
        )
        return [dict(row._mapping) for row in result]

async def get_financial_rulesets(tenant_id: str) -> List[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("SELECT * FROM public.financial_rulesets WHERE tenant_id = :tenant_id"),
            {"tenant_id": tenant_id}
        )
        return [dict(row._mapping) for row in result]
