"""Interface for LLM client"""

from abc import ABC, abstractmethod
from typing import Optional

from src.domain.models import ContentType


class LLMClient(ABC):
    """Abstract interface for LLM clients"""
    
    @abstractmethod
    def generate_documentation(
        self,
        content: str,
        content_type: ContentType,
        title: Optional[str] = None,
        file_count: Optional[int] = None,
        timeout: Optional[int] = None,
    ) -> str:
        """
        Generate documentation from content.
        
        Args:
            content: The raw content to document
            content_type: Type of content (code or text)
            title: Optional title for the document
            
        Returns:
            Generated markdown documentation
            
        Raises:
            RuntimeError: If generation fails
        """
        pass

