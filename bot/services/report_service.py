from collections import defaultdict

from database import repository


def _format_amount(amount: float, currency: str = "IDR") -> str:
    """Format amount with thousand separators."""
    if currency == "IDR":
        return f"Rp {amount:,.0f}"
    return f"{currency} {amount:,.2f}"


def _build_report(title: str, rows: list[dict], currency: str = "IDR") -> str:
    """Build a formatted report string from transaction rows."""
    if not rows:
        return f"📊 *{title}*\n\nNo transactions found."

    income = 0.0
    expense = 0.0
    by_category: dict[str, float] = defaultdict(float)

    lines: list[str] = []
    for r in rows:
        amt = float(r["amount"])
        tx_type = r["type"]
        cat_info = r.get("categories")
        cat_icon = cat_info["icon"] if cat_info and cat_info.get("icon") else "•"
        cat_name = cat_info["name"] if cat_info and cat_info.get("name") else "other"
        desc = r.get("description") or cat_name

        if tx_type == "income":
            income += amt
            lines.append(f"  {cat_icon} +{_format_amount(amt, currency)}  {desc}")
        else:
            expense += amt
            by_category[f"{cat_icon} {cat_name}"] += amt
            lines.append(f"  {cat_icon} -{_format_amount(amt, currency)}  {desc}")

    balance = income - expense

    report = f"📊 *{title}*\n\n"
    report += "\n".join(lines[-20:])  # show last 20 entries max
    if len(rows) > 20:
        report += f"\n  ... and {len(rows) - 20} more"

    report += "\n\n─────────────────\n"
    report += f"💰 Income:  {_format_amount(income, currency)}\n"
    report += f"💸 Expense: {_format_amount(expense, currency)}\n"
    report += f"📌 Balance: {_format_amount(balance, currency)}\n"

    if by_category:
        report += "\n📂 *By Category:*\n"
        sorted_cats = sorted(by_category.items(), key=lambda x: x[1], reverse=True)
        for cat, total in sorted_cats[:10]:
            report += f"  {cat}: {_format_amount(total, currency)}\n"

    return report


async def daily_report(telegram_id: int) -> str:
    user = await repository.get_or_create_user(telegram_id)
    rows = await repository.get_today_transactions(user.id)
    return _build_report("Daily Report", rows, user.currency)


async def monthly_report(telegram_id: int) -> str:
    user = await repository.get_or_create_user(telegram_id)
    rows = await repository.get_month_transactions(user.id)
    return _build_report("Monthly Report", rows, user.currency)


async def balance_report(telegram_id: int) -> str:
    user = await repository.get_or_create_user(telegram_id)
    bal = await repository.get_balance(user.id)

    currency = user.currency
    return (
        "💰 *Balance Summary*\n\n"
        f"📈 Total Income:  {_format_amount(bal['income'], currency)}\n"
        f"📉 Total Expense: {_format_amount(bal['expense'], currency)}\n"
        f"─────────────────\n"
        f"📌 Balance: {_format_amount(bal['balance'], currency)}"
    )
