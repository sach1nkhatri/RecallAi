"""Application settings and configuration"""

import os
from pathlib import Path
from typing import Optional


class Settings:
    """Application configuration settings"""
    
    # LM Studio Configuration
    LM_STUDIO_BASE_URL: str = os.getenv("LM_STUDIO_BASE_URL", "http://192.168.1.83:1234/v1")
    LM_MODEL_NAME: str = os.getenv("LM_MODEL_NAME", "gpt-oss-20b")
    LM_STUDIO_TIMEOUT: int = int(os.getenv("LM_STUDIO_TIMEOUT", "90"))
    
    # File Upload Configuration
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    MAX_CONTENT_PREVIEW: int = int(os.getenv("MAX_CONTENT_PREVIEW", "8000"))
    MAX_FILES: int = int(os.getenv("MAX_FILES", "5"))
    
    # Allowed file extensions
    ALLOWED_EXTENSIONS: set[str] = {
        "py", "js", "jsx", "ts", "tsx", "java", "kt", "dart", "go", "rs", "cpp", "c", "h", "cs",
        "html", "css", "md", "txt", "json", "yaml", "yml",
        "pdf", "doc", "docx", "xml"
    }
    
    # API Configuration
    API_PORT: int = int(os.getenv("PORT", "5001"))
    API_HOST: str = os.getenv("HOST", "0.0.0.0")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")
    
    # Base directories
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    FRONTEND_DIR: Path = BASE_DIR.parent / "frontend"
    UPLOAD_PATH: Path = BASE_DIR / UPLOAD_DIR
    
    @classmethod
    def ensure_directories(cls) -> None:
        """Ensure required directories exist"""
        cls.UPLOAD_PATH.mkdir(parents=True, exist_ok=True)


# Global settings instance
settings = Settings()

