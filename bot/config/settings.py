from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Telegram
    telegram_bot_token: str

    # Supabase
    supabase_url: str
    supabase_key: str

    # NLP Provider
    nlp_provider: str = "openai"  # "openai" or "gemini"

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # Bot Settings
    timezone: str = "Asia/Jakarta"
    default_currency: str = "IDR"
    log_level: str = "INFO"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
