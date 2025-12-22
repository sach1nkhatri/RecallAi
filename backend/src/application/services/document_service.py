"""Document generation service"""

import logging
import time
from pathlib import Path
from typing import Optional

from src.application.interfaces.llm_client import LLMClient
from src.application.interfaces.pdf_generator import PDFGenerator
from src.config.settings import settings
from src.domain.models import DocumentGeneration, GeneratedDocument, ContentType
from src.domain.exceptions import ValidationError

logger = logging.getLogger(__name__)


class DocumentService:
    """Service for document generation operations"""
    
    def __init__(
        self,
        llm_client: LLMClient,
        pdf_generator: PDFGenerator,
    ):
        self.llm_client = llm_client
        self.pdf_generator = pdf_generator
    
    def generate_document(
        self,
        generation: DocumentGeneration,
    ) -> GeneratedDocument:
        """
        Generate documentation from content.
        
        Args:
            generation: Document generation request
            
        Returns:
            Generated document with markdown and PDF
            
        Raises:
            ValidationError: If request is invalid
            RuntimeError: If generation fails
        """
        # Validate request
        generation.validate()
        
        if len(generation.raw_content) > settings.MAX_CONTENT_PREVIEW:
            raise ValidationError(
                f"Content too long. Limit is {settings.MAX_CONTENT_PREVIEW} characters."
            )
        
        # Generate markdown documentation
        start_time = time.time()
        try:
            markdown_content = self.llm_client.generate_documentation(
                content=generation.raw_content,
                content_type=generation.content_type,
                title=generation.title,
            )
        except Exception as e:
            logger.exception("Document generation failed")
            raise RuntimeError(f"Failed to generate documentation: {e}") from e
        
        duration = round(time.time() - start_time, 2)
        logger.info(
            f"Generated doc | type={generation.content_type} | "
            f"title={bool(generation.title)} | chars={len(generation.raw_content)} | "
            f"files={generation.file_count or 'n/a'} | duration={duration}s"
        )
        
        # Generate PDF
        pdf_path: Optional[Path] = None
        pdf_url: Optional[str] = None
        
        try:
            timestamp = int(time.time())
            pdf_filename = f"doc-{timestamp}.pdf"
            pdf_path = settings.UPLOAD_PATH / pdf_filename
            
            self.pdf_generator.generate_from_markdown(
                markdown=markdown_content,
                output_path=pdf_path,
            )
            
            pdf_url = f"/uploads/{pdf_filename}"
            logger.info(f"Generated PDF: {pdf_path}")
        except Exception as e:
            logger.exception("PDF generation failed")
            # Don't fail the whole request if PDF fails
            logger.warning("Continuing without PDF generation")
        
        return GeneratedDocument(
            markdown_content=markdown_content,
            pdf_path=pdf_path,
            pdf_url=pdf_url,
            content_type=generation.content_type,
            file_count=generation.file_count,
        )

