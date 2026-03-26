from abc import ABC, abstractmethod

from database.models import ParsedTransaction


class NLPProvider(ABC):
    """Abstract interface for NLP transaction parsing.

    Implement this to add a new provider (API or local model).
    The bot only depends on this interface, making providers swappable.
    """

    provider_name: str = "base"
    model_name: str = "unknown"

    @abstractmethod
    async def parse_transaction(self, text: str) -> ParsedTransaction:
        """Parse natural language text into a structured ParsedTransaction.

        Args:
            text: Raw user input, e.g. "Buy coffee 20k"

        Returns:
            ParsedTransaction with type, amount, category, description, confidence.

        Raises:
            ValueError: If the text cannot be parsed as a transaction.
        """
        ...

    @abstractmethod
    async def get_raw_response(self) -> str:
        """Return the raw API/model response from the last parse call.

        Used for logging to training_logs table.
        """
        ...
