"""Application interfaces - Abstract definitions for external services"""

from .llm_client import LLMClient
from .pdf_generator import PDFGenerator

__all__ = ["LLMClient", "PDFGenerator"]

