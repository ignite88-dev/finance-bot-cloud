from config.settings import settings
from services.nlp.base import NLPProvider
from services.nlp.deepseek_provider import DeepSeekNLPProvider
from services.nlp.openai_provider import OpenAINLPProvider
from services.nlp.gemini_provider import GeminiNLPProvider

_PROVIDERS: dict[str, type[NLPProvider]] = {
    "deepseek": DeepSeekNLPProvider,
    "openai": OpenAINLPProvider,
    "gemini": GeminiNLPProvider,
    # Future: "local": LocalModelProvider
}


def create_nlp_provider(provider_name: str | None = None) -> NLPProvider:
    """Create an NLP provider instance by name.

    Args:
        provider_name: "openai", "gemini", or None (uses config default).

    Returns:
        An NLPProvider instance ready to use.
    """
    name = provider_name or settings.nlp_provider
    cls = _PROVIDERS.get(name)
    if cls is None:
        raise ValueError(
            f"Unknown NLP provider '{name}'. Available: {list(_PROVIDERS.keys())}"
        )
    return cls()
