import json
import logging

from openai import AsyncOpenAI

from config.settings import settings
from database.models import ParsedTransaction
from services.nlp.base import NLPProvider

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a financial transaction parser. Extract transaction data from user messages.

Rules:
- Detect if it's "income" or "expense" (default: expense).
- Extract the amount as a number. Handle shorthand: "20k" = 20000, "1.5jt" or "1.5m" = 1500000.
- Determine the most fitting category from: food, transport, shopping, entertainment, health, bills, education, housing, personal, other_expense, salary, freelance, investment, gift, other_income.
- Extract a short description of the transaction.
- Estimate your confidence (0.0 to 1.0).
- Currency default: IDR.

Respond ONLY with valid JSON:
{"type": "expense", "amount": 20000, "currency": "IDR", "category": "food", "description": "coffee", "confidence": 0.95}
"""


class OpenAINLPProvider(NLPProvider):
    provider_name = "openai"

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model_name = settings.openai_model
        self._last_raw_response: str = ""

    async def parse_transaction(self, text: str) -> ParsedTransaction:
        response = await self.client.chat.completions.create(
            model=self.model_name,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            temperature=0.1,
            max_tokens=200,
        )

        raw = response.choices[0].message.content.strip()
        self._last_raw_response = raw

        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            raw = raw.rsplit("```", 1)[0]

        data = json.loads(raw)
        return ParsedTransaction(**data)

    async def get_raw_response(self) -> str:
        return self._last_raw_response
