"""Application settings and configuration"""

import os
from pathlib import Path
from typing import Optional


class Settings:
    """Application configuration settings"""
    
    # LM Studio Configuration
    LM_STUDIO_BASE_URL: str = os.getenv("LM_STUDIO_BASE_URL", "http://192.168.1.83:1234/v1")
    LM_MODEL_NAME: str = os.getenv("LM_MODEL_NAME", "qwen3-14b")
    LM_STUDIO_EMBED_MODEL: str = os.getenv("LM_STUDIO_EMBED_MODEL", "qwen-2.5-1.5b-embedding-entropy-rl-1")
    LM_STUDIO_TIMEOUT: int = int(os.getenv("LM_STUDIO_TIMEOUT", "3600"))  # 60 minutes default for slow 14B models and large generations
    
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
    GITHUB_MAX_REPO_FILES: int = int(os.getenv("GITHUB_MAX_REPO_FILES", "100"))  # Increased from 60 to 100
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
    
    # Node Backend Configuration (for status reporting)
    NODE_BACKEND_URL: str = os.getenv("NODE_BACKEND_URL", "http://localhost:5002")
    
    # MongoDB Configuration
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017/recall_ai")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "recall_ai")
    
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

