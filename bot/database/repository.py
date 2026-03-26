from datetime import datetime, timedelta
from typing import Any

import pytz

from config.settings import settings
from database.supabase_client import get_supabase
from database.models import User, Transaction, TrainingLog


# ── Users ────────────────────────────────────────────────────────────

async def get_or_create_user(telegram_id: int, username: str | None = None,
                             first_name: str | None = None,
                             last_name: str | None = None) -> User:
    """Get existing user or create a new one. Returns User model."""
    db = get_supabase()
    result = db.table("users").select("*").eq("telegram_id", telegram_id).execute()

    if result.data:
        return User(**result.data[0])

    new_user = {
        "telegram_id": telegram_id,
        "username": username,
        "first_name": first_name,
        "last_name": last_name,
    }
    result = db.table("users").insert(new_user).execute()
    return User(**result.data[0])


# ── Categories ───────────────────────────────────────────────────────

async def get_category_by_name(name: str) -> dict[str, Any] | None:
    """Look up a category by name."""
    db = get_supabase()
    result = db.table("categories").select("*").eq("name", name).execute()
    return result.data[0] if result.data else None


async def get_all_categories() -> list[dict[str, Any]]:
    db = get_supabase()
    return db.table("categories").select("*").execute().data


# ── Transactions ─────────────────────────────────────────────────────

async def create_transaction(user_id: int, tx_type: str, amount: float,
                             currency: str, category_id: int | None,
                             description: str | None,
                             raw_input: str | None) -> Transaction:
    db = get_supabase()
    row = {
        "user_id": user_id,
        "type": tx_type,
        "amount": amount,
        "currency": currency,
        "category_id": category_id,
        "description": description,
        "raw_input": raw_input,
    }
    result = db.table("transactions").insert(row).execute()
    return Transaction(**result.data[0])


async def get_transactions_between(user_id: int, start: datetime,
                                   end: datetime) -> list[dict[str, Any]]:
    db = get_supabase()
    return (
        db.table("transactions")
        .select("*, categories(name, icon)")
        .eq("user_id", user_id)
        .gte("created_at", start.isoformat())
        .lte("created_at", end.isoformat())
        .order("created_at", desc=True)
        .execute()
        .data
    )


async def get_balance(user_id: int) -> dict[str, float]:
    """Return {"income": ..., "expense": ..., "balance": ...}."""
    db = get_supabase()
    rows = (
        db.table("transactions")
        .select("type, amount")
        .eq("user_id", user_id)
        .execute()
        .data
    )
    income = sum(float(r["amount"]) for r in rows if r["type"] == "income")
    expense = sum(float(r["amount"]) for r in rows if r["type"] == "expense")
    return {"income": income, "expense": expense, "balance": income - expense}


async def get_today_transactions(user_id: int) -> list[dict[str, Any]]:
    tz = pytz.timezone(settings.timezone)
    now = datetime.now(tz)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    return await get_transactions_between(user_id, start, end)


async def get_month_transactions(user_id: int) -> list[dict[str, Any]]:
    tz = pytz.timezone(settings.timezone)
    now = datetime.now(tz)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 12:
        end = start.replace(year=now.year + 1, month=1)
    else:
        end = start.replace(month=now.month + 1)
    return await get_transactions_between(user_id, start, end)


# ── Training Logs ────────────────────────────────────────────────────

async def save_training_log(user_input: str, raw_response: str,
                            parsed_json: dict[str, Any], provider: str,
                            model: str, confidence: float,
                            user_id: int | None = None,
                            processing_time_ms: int | None = None) -> TrainingLog:
    db = get_supabase()
    row = {
        "user_input": user_input,
        "raw_ai_response": raw_response,
        "parsed_json": parsed_json,
        "provider": provider,
        "model": model,
        "confidence": confidence,
        "user_id": user_id,
        "processing_time_ms": processing_time_ms,
    }
    result = db.table("training_logs").insert(row).execute()
    return TrainingLog(**result.data[0])
