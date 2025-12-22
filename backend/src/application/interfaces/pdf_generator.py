"""Interface for PDF generation"""

from abc import ABC, abstractmethod
from pathlib import Path


class PDFGenerator(ABC):
    """Abstract interface for PDF generators"""
    
    @abstractmethod
    def generate_from_markdown(self, markdown: str, output_path: Path) -> None:
        """
        Generate PDF from markdown content.
        
        Args:
            markdown: Markdown content to convert
            output_path: Path where PDF should be saved
            
        Raises:
            Exception: If PDF generation fails
        """
        pass

