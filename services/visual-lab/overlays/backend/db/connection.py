"""Database connection overlay for the KampüsGO Visual Lab pilot."""

from __future__ import annotations

import os

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from .models import Base


def _normalize_database_url(value: str | None) -> str:
    if not value:
        return "sqlite+aiosqlite:///./visual-lab.db"

    normalized = value.strip()
    if normalized.startswith("postgres://"):
        return normalized.replace("postgres://", "postgresql+asyncpg://", 1)
    if normalized.startswith("postgresql://"):
        return normalized.replace("postgresql://", "postgresql+asyncpg://", 1)
    if normalized.startswith("sqlite://") and not normalized.startswith(
        "sqlite+aiosqlite://"
    ):
        return normalized.replace("sqlite://", "sqlite+aiosqlite://", 1)
    return normalized


DATABASE_URL = _normalize_database_url(os.getenv("DATABASE_URL"))

engine_options: dict[str, object] = {
    "echo": os.getenv("ENVIRONMENT", "development").lower() == "development",
    "pool_pre_ping": True,
}

# QueuePool options do not apply to SQLite's async pool implementations.
if not DATABASE_URL.startswith("sqlite+"):
    engine_options.update(pool_size=5, max_overflow=10)

engine = create_async_engine(DATABASE_URL, **engine_options)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
