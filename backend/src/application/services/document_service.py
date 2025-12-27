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
        
        # Log content info for debugging
        logger.info(
            f"Generating documentation | content_length={len(generation.raw_content)} | "
            f"type={generation.content_type} | files={generation.file_count or 'direct'}"
        )
        
        # Check if content exceeds limit (warn but don't fail for slightly over)
        if len(generation.raw_content) > settings.MAX_CONTENT_PREVIEW * 1.1:
            logger.warning(
                f"Content length {len(generation.raw_content)} exceeds limit {settings.MAX_CONTENT_PREVIEW}. "
                f"Processing anyway but may be truncated by LLM."
            )
        
        # Pre-process content for better results - NO TRUNCATION, send full content
        processed_content = generation.raw_content.strip()
        
        # Only truncate if absolutely necessary (way over limit) and preserve structure
        if len(processed_content) > settings.MAX_CONTENT_PREVIEW * 1.5:
            logger.warning(f"Content very large ({len(processed_content)} chars), truncating to preserve structure")
            # Keep first 70% and last 30% to preserve both start and end context
            keep_start = int(settings.MAX_CONTENT_PREVIEW * 0.7)
            keep_end = int(settings.MAX_CONTENT_PREVIEW * 0.3)
            processed_content = (
                processed_content[:keep_start] + 
                "\n\n[... content truncated for processing - middle section removed ...]\n\n" + 
                processed_content[-keep_end:]
            )
            logger.info(f"Truncated to {len(processed_content)} characters")
        
        # Generate markdown documentation
        start_time = time.time()
        try:
            markdown_content = self.llm_client.generate_documentation(
                content=processed_content,
                content_type=generation.content_type,
                title=generation.title,
                file_count=generation.file_count,
            )
            
            # Validate the generated content
            if not markdown_content or len(markdown_content.strip()) < 50:
                logger.error("Generated documentation is too short or empty")
                raise RuntimeError("Generated documentation is incomplete. Please try again.")
            
        except RuntimeError:
            # Re-raise runtime errors as-is
            raise
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

