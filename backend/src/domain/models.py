"""Domain models and value objects"""

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Literal, Optional

ContentType = Literal["code", "text"]


@dataclass
class FileUpload:
    """Represents an uploaded file"""
    filename: str
    file_path: Path
    content_type: ContentType
    size: int
    uploaded_at: datetime
    
    @property
    def extension(self) -> str:
        """Get file extension"""
        return self.filename.rsplit(".", 1)[1].lower() if "." in self.filename else ""


@dataclass
class DocumentGeneration:
    """Represents a document generation request"""
    raw_content: str
    content_type: ContentType
    title: Optional[str] = None
    file_count: Optional[int] = None
    
    def validate(self) -> None:
        """Validate the generation request"""
        if not self.raw_content or not self.raw_content.strip():
            raise ValueError("raw_content must not be empty")
        if self.content_type not in {"code", "text"}:
            raise ValueError("contentType must be 'code' or 'text'")


@dataclass
class GeneratedDocument:
    """Represents a generated document"""
    markdown_content: str
    pdf_path: Optional[Path] = None
    pdf_url: Optional[str] = None
    content_type: ContentType = "text"
    file_count: Optional[int] = None

