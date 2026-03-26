import logging
import time

from database import repository
from database.models import ParsedTransaction, Transaction
from services.nlp.base import NLPProvider

logger = logging.getLogger(__name__)


async def process_message(text: str, telegram_id: int, nlp: NLPProvider,
                          username: str | None = None,
                          first_name: str | None = None) -> Transaction:
    """Full pipeline: parse text with NLP -> save transaction -> log for training.

    Args:
        text: Raw user message, e.g. "Buy coffee 20k"
        telegram_id: Telegram user ID.
        nlp: The NLP provider instance to use.
        username: Telegram username (for user creation).
        first_name: Telegram first name.

    Returns:
        The saved Transaction.

    Raises:
        ValueError: If the NLP provider cannot parse the text.
    """
    # 1. Ensure user exists
    user = await repository.get_or_create_user(
        telegram_id=telegram_id,
        username=username,
        first_name=first_name,
    )

    # 2. Parse with NLP
    start_ms = time.monotonic()
    parsed: ParsedTransaction = await nlp.parse_transaction(text)
    elapsed_ms = int((time.monotonic() - start_ms) * 1000)

    raw_response = await nlp.get_raw_response()

    # 3. Resolve category
    category = await repository.get_category_by_name(parsed.category)
    category_id = category["id"] if category else None

    # 4. Save transaction
    transaction = await repository.create_transaction(
        user_id=user.id,
        tx_type=parsed.type,
        amount=float(parsed.amount),
        currency=parsed.currency,
        category_id=category_id,
        description=parsed.description,
        raw_input=text,
    )

    # 5. Log to training_logs (Phase 2 - self-learning loop)
    try:
        await repository.save_training_log(
            user_input=text,
            raw_response=raw_response,
            parsed_json=parsed.model_dump(mode="json"),
            provider=nlp.provider_name,
            model=nlp.model_name,
            confidence=parsed.confidence,
            user_id=user.id,
            processing_time_ms=elapsed_ms,
        )
    except Exception:
        logger.exception("Failed to save training log (non-critical)")

    logger.info(
        "Transaction saved: %s %s %s (%.0f%% confidence)",
        parsed.type, parsed.amount, parsed.category, parsed.confidence * 100,
    )
    return transaction
