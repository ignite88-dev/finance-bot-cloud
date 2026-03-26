import logging

from telegram import Update
from telegram.ext import ContextTypes

from services import transaction_service
from services.nlp.base import NLPProvider

logger = logging.getLogger(__name__)


def create_message_handler(nlp: NLPProvider):
    """Create a message handler closure with the given NLP provider.

    This factory pattern allows injecting the NLP provider at startup
    while keeping the handler signature compatible with python-telegram-bot.
    """

    async def handle_message(update: Update,
                             context: ContextTypes.DEFAULT_TYPE) -> None:
        """Process natural language messages to record transactions."""
        text = update.message.text
        if not text or text.startswith("/"):
            return

        user = update.effective_user
        telegram_id = user.id

        await update.message.reply_chat_action("typing")

        try:
            tx = await transaction_service.process_message(
                text=text,
                telegram_id=telegram_id,
                nlp=nlp,
                username=user.username,
                first_name=user.first_name,
            )

            emoji = "💰" if tx.type == "income" else "💸"
            amount_str = f"Rp {float(tx.amount):,.0f}" if tx.currency == "IDR" else f"{tx.currency} {float(tx.amount):,.2f}"

            await update.message.reply_text(
                f"{emoji} *Transaction Recorded!*\n\n"
                f"Type: {tx.type.capitalize()}\n"
                f"Amount: {amount_str}\n"
                f"Description: {tx.description or '-'}\n\n"
                f"Use /balance to check your balance.",
                parse_mode="Markdown",
            )

        except (ValueError, KeyError) as e:
            logger.warning("Could not parse message '%s': %s", text, e)
            await update.message.reply_text(
                "🤔 I couldn't understand that as a transaction.\n\n"
                "Try something like:\n"
                '• "Buy coffee 20k"\n'
                '• "Salary 5jt"\n\n'
                "Type /help for more examples.",
            )
        except Exception:
            logger.exception("Error processing message: %s", text)
            await update.message.reply_text(
                "❌ Something went wrong. Please try again."
            )

    return handle_message
