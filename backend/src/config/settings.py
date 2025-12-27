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
    MAX_CONTENT_PREVIEW: int = int(os.getenv("MAX_CONTENT_PREVIEW", "200000"))  # Increased to 200KB for real documents
    MAX_FILES: int = int(os.getenv("MAX_FILES", "5"))
    
    # Allowed file extensions
    ALLOWED_EXTENSIONS: set[str] = {
        "py", "js", "jsx", "ts", "tsx", "java", "kt", "dart", "go", "rs", "cpp", "c", "h", "cs",
        "html", "css", "md", "txt", "json", "yaml", "yml",
        "pdf", "doc", "docx", "xml"
    }
    
    # GitHub Repository Configuration
    GITHUB_TOKEN: Optional[str] = os.getenv("GITHUB_TOKEN")  # Optional, for rate limits
    GITHUB_API_BASE: str = "https://api.github.com"
    GITHUB_MAX_REPO_FILES: int = int(os.getenv("GITHUB_MAX_REPO_FILES", "60"))
    GITHUB_MAX_TOTAL_CHARS: int = int(os.getenv("GITHUB_MAX_TOTAL_CHARS", "200000"))
    GITHUB_MAX_SINGLE_FILE_SIZE: int = int(os.getenv("GITHUB_MAX_SINGLE_FILE_SIZE", "200000"))  # 200KB
    GITHUB_TIMEOUT: int = int(os.getenv("GITHUB_TIMEOUT", "60"))
    
    # RAG Pipeline Configuration
    RAG_CHUNK_SIZE: int = int(os.getenv("RAG_CHUNK_SIZE", "700"))
    RAG_CHUNK_OVERLAP: int = int(os.getenv("RAG_CHUNK_OVERLAP", "80"))
    RAG_TOP_K: int = int(os.getenv("RAG_TOP_K", "5"))
    RAG_INDEX_DIR: str = os.getenv("RAG_INDEX_DIR", "data/rag_indices")
    
    # API Configuration
    API_PORT: int = int(os.getenv("PORT", "5001"))
    API_HOST: str = os.getenv("HOST", "0.0.0.0")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")
    
    # Base directories
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    FRONTEND_DIR: Path = BASE_DIR.parent / "frontend"
    UPLOAD_PATH: Path = BASE_DIR / UPLOAD_DIR
    RAG_INDEX_PATH: Path = BASE_DIR / RAG_INDEX_DIR
    
    @classmethod
    def ensure_directories(cls) -> None:
        """Ensure required directories exist"""
        cls.UPLOAD_PATH.mkdir(parents=True, exist_ok=True)
        cls.RAG_INDEX_PATH.mkdir(parents=True, exist_ok=True)


# Global settings instance
settings = Settings()

