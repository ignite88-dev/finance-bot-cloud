import logging

from telegram import Update
from telegram.ext import ContextTypes

from services import report_service

logger = logging.getLogger(__name__)


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start - welcome message."""
    await update.message.reply_text(
        "👋 *Welcome to Finance Bot!*\n\n"
        "I can help you track income and expenses using natural language.\n\n"
        "*How to use:*\n"
        '• Just type something like: "Buy coffee 20k"\n'
        '• Or: "Salary received 5jt"\n\n'
        "*Commands:*\n"
        "/balance - Check your balance\n"
        "/daily - Today's report\n"
        "/monthly - This month's report\n"
        "/help - Show this message",
        parse_mode="Markdown",
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /help - show usage instructions."""
    await update.message.reply_text(
        "📖 *Finance Bot Help*\n\n"
        "*Recording transactions:*\n"
        "Simply type a message describing your transaction:\n"
        '• "Lunch 35k" → expense, food, Rp 35,000\n'
        '• "Grab to office 25k" → expense, transport, Rp 25,000\n'
        '• "Freelance payment 2jt" → income, freelance, Rp 2,000,000\n'
        '• "Monthly salary 8.5jt" → income, salary, Rp 8,500,000\n\n'
        "*Commands:*\n"
        "/balance - Total income, expense, and balance\n"
        "/daily - Today's transaction report\n"
        "/monthly - This month's report\n"
        "/help - Show this message",
        parse_mode="Markdown",
    )


async def balance_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /balance - show balance summary."""
    telegram_id = update.effective_user.id
    try:
        text = await report_service.balance_report(telegram_id)
        await update.message.reply_text(text, parse_mode="Markdown")
    except Exception:
        logger.exception("Error generating balance report")
        await update.message.reply_text("❌ Failed to generate balance. Please try again.")


async def daily_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /daily - show today's report."""
    telegram_id = update.effective_user.id
    try:
        text = await report_service.daily_report(telegram_id)
        await update.message.reply_text(text, parse_mode="Markdown")
    except Exception:
        logger.exception("Error generating daily report")
        await update.message.reply_text("❌ Failed to generate report. Please try again.")


async def monthly_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /monthly - show this month's report."""
    telegram_id = update.effective_user.id
    try:
        text = await report_service.monthly_report(telegram_id)
        await update.message.reply_text(text, parse_mode="Markdown")
    except Exception:
        logger.exception("Error generating monthly report")
        await update.message.reply_text("❌ Failed to generate report. Please try again.")
