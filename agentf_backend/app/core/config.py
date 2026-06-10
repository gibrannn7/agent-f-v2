from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = ""
    NEXT_PUBLIC_SUPABASE_URL: str = ""
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: str = ""
    SUPABASE_PASSWORD: str = ""
    DATABASE_URL: str = ""
    SUPABASE_JWT_SECRET: str = "fallback_secret_for_local_dev_only"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), "../../../.env"), 
        env_file_encoding="utf-8", 
        extra="ignore"
    )

settings = Settings()
