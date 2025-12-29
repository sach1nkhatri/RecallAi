"""Text extraction utilities for RAG"""

import os
from typing import Optional

try:
    from PyPDF2 import PdfReader
except ImportError:
    PdfReader = None  # type: ignore


SUPPORTED_TEXT_EXTENSIONS = {".txt", ".md", ".rtf", ".csv", ".json"}


def extract_text(file_path: str) -> str:
    """
    Extract raw text from a PDF or plain text file.
    
    Args:
        file_path: Path to the file to extract text from
        
    Returns:
        Extracted text content
        
    Raises:
        ValueError: If file type is unsupported or no text could be extracted
    """
    _, ext = os.path.splitext(file_path.lower())
    if ext == ".pdf":
        if PdfReader is None:
            raise ImportError(
                "PyPDF2 is required for PDF extraction. "
                "Install it with: pip install PyPDF2"
            )
        text = _extract_pdf(file_path)
    elif ext in SUPPORTED_TEXT_EXTENSIONS:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
    else:
        raise ValueError(
            f"Unsupported file type '{ext or 'unknown'}'. "
            "Upload PDF, JSON, or UTF-8 text/Markdown/CSV files."
        )

    normalized = (text or "").strip()
    if not normalized:
        raise ValueError("No readable text could be extracted from the uploaded file.")
    return normalized


def _extract_pdf(file_path: str) -> str:
    """Extract text from PDF file"""
    if PdfReader is None:
        raise ImportError("PyPDF2 is required for PDF extraction")
    
    reader = PdfReader(file_path)
    pages = []
    for page in reader.pages:
        try:
            pages.append(page.extract_text() or "")
        except Exception:
            pages.append("")
    return "\n".join(pages)

