import logging
import sys

from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters

from config.settings import settings
from handlers.commands import (
    start_command,
    help_command,
    balance_command,
    daily_command,
    monthly_command,
)
from handlers.messages import create_message_handler
from services.nlp.factory import create_nlp_provider


def setup_logging() -> None:
    logging.basicConfig(
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        stream=sys.stdout,
    )


def main() -> None:
    setup_logging()
    logger = logging.getLogger(__name__)

    # Initialize swappable NLP provider
    nlp = create_nlp_provider()
    logger.info("NLP provider: %s (%s)", nlp.provider_name, nlp.model_name)

    # Build the Telegram bot application
    app = ApplicationBuilder().token(settings.telegram_bot_token).build()

    # Register command handlers
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("balance", balance_command))
    app.add_handler(CommandHandler("daily", daily_command))
    app.add_handler(CommandHandler("monthly", monthly_command))

    # Register message handler (natural language -> transaction)
    message_handler = create_message_handler(nlp)
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, message_handler))

    logger.info("Bot starting... (polling mode)")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
