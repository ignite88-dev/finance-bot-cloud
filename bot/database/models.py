from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel


class User(BaseModel):
    id: int | None = None
    telegram_id: int
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    role: str = "user"
    timezone: str = "Asia/Jakarta"
    currency: str = "IDR"
    created_at: datetime | None = None


class Category(BaseModel):
    id: int | None = None
    name: str
    type: str  # "income" or "expense"
    icon: str | None = None


class Transaction(BaseModel):
    id: int | None = None
    user_id: int
    type: str  # "income" or "expense"
    amount: Decimal
    currency: str = "IDR"
    category_id: int | None = None
    description: str | None = None
    raw_input: str | None = None
    created_at: datetime | None = None


class ParsedTransaction(BaseModel):
    """NLP output: structured data extracted from natural language."""
    type: str  # "income" or "expense"
    amount: Decimal
    currency: str = "IDR"
    category: str  # category name (matched to categories table)
    description: str | None = None
    confidence: float = 1.0


class TrainingLog(BaseModel):
    id: int | None = None
    user_input: str
    raw_ai_response: str | None = None
    parsed_json: dict[str, Any] | None = None
    provider: str | None = None
    model: str | None = None
    confidence: float | None = None
    is_correct: bool = True
    corrected_json: dict[str, Any] | None = None
    user_id: int | None = None
    processing_time_ms: int | None = None
    created_at: datetime | None = None
