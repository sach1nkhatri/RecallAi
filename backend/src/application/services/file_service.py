"""File handling service"""

import logging
from datetime import datetime
from pathlib import Path
from typing import List, Tuple
from werkzeug.utils import secure_filename

from src.config.settings import settings
from src.domain.models import FileUpload, ContentType
from src.domain.exceptions import FileProcessingError, ValidationError

logger = logging.getLogger(__name__)


class FileService:
    """Service for handling file operations"""
    
    @staticmethod
    def is_allowed_file(filename: str) -> bool:
        """Check if file extension is allowed"""
        if "." not in filename:
            return False
        ext = filename.rsplit(".", 1)[1].lower()
        return ext in settings.ALLOWED_EXTENSIONS
    
    @staticmethod
    def detect_content_type(filename: str) -> ContentType:
        """Detect content type from filename"""
        ext = filename.rsplit(".", 1)[1].lower() if "." in filename else ""
        code_extensions = {
            "py", "js", "jsx", "ts", "tsx", "java", "kt", "dart", 
            "go", "rs", "cpp", "c", "h", "cs"
        }
        return "code" if ext in code_extensions else "text"
    
    @staticmethod
    def read_file_content(file_path: Path, limit_bytes: int = None) -> str:
        """Read file content with optional size limit
        
        Args:
            file_path: Path to the file to read
            limit_bytes: Optional limit. If None, reads up to MAX_CONTENT_PREVIEW.
                        Pass a large number or None to read full file for generation.
        """
        try:
            # For generation, we want full content, so use MAX_CONTENT_PREVIEW as soft limit
            # Only apply hard limit if explicitly set
            if limit_bytes is None:
                # Read full file but warn if exceeds MAX_CONTENT_PREVIEW
                with file_path.open("r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    if len(content) > settings.MAX_CONTENT_PREVIEW:
                        logger.warning(
                            f"File {file_path.name} is {len(content)} chars, exceeds limit {settings.MAX_CONTENT_PREVIEW}. "
                            f"Processing anyway but may be truncated later."
                        )
                    logger.info(f"Read {len(content)} characters from {file_path.name}")
                    return content
            else:
                # Explicit limit provided
                with file_path.open("r", encoding="utf-8", errors="ignore") as f:
                    content = f.read(limit_bytes)
                    logger.info(f"Read {len(content)} characters (limited) from {file_path.name}")
                    return content
        except OSError as e:
            logger.error(f"Failed to read file {file_path}: {e}")
            raise FileProcessingError(f"Cannot read file: {e}") from e
    
    @staticmethod
    def save_uploaded_files(files: List) -> Tuple[List[FileUpload], List[str]]:
        """
        Save uploaded files and return FileUpload objects.
        
        Returns:
            Tuple of (saved files, skipped filenames)
        """
        if not files:
            raise ValidationError("No files provided")
        
        if len(files) > settings.MAX_FILES:
            raise ValidationError(f"Too many files. Maximum allowed is {settings.MAX_FILES}.")
        
        saved: List[FileUpload] = []
        skipped: List[str] = []
        
        for file in files:
            if not file.filename:
                raise ValidationError("No selected file")
            
            if not FileService.is_allowed_file(file.filename):
                skipped.append(file.filename)
                logger.info(f"Skipping unsupported file type: {file.filename}")
                continue
            
            safe_name = secure_filename(file.filename)
            saved_path = settings.UPLOAD_PATH / safe_name
            file.save(saved_path)
            
            content_type = FileService.detect_content_type(file.filename)
            file_upload = FileUpload(
                filename=safe_name,
                file_path=saved_path,
                content_type=content_type,
                size=file.content_length or 0,
                uploaded_at=datetime.fromtimestamp(Path(saved_path).stat().st_mtime)
            )
            
            saved.append(file_upload)
            logger.info(f"Saved upload to {saved_path}")
        
        if not saved:
            raise ValidationError("No supported files uploaded")
        
        return saved, skipped
    
    @staticmethod
    def combine_file_contents(uploads: List[FileUpload]) -> str:
        """Combine contents of multiple files into a single string with intelligent formatting"""
        combined_parts: List[str] = []
        
        for idx, upload in enumerate(uploads, 1):
            ext = upload.extension
            if ext in {"pdf", "doc", "docx"}:
                logger.warning(f"Binary document {upload.filename} cannot be processed - content extraction not available")
                content = f"[Binary document detected: {upload.filename} - Content extraction not available for this file type]"
            else:
                try:
                    # Read full file content without truncation for generation
                    content = FileService.read_file_content(upload.file_path, limit_bytes=None)
                    logger.info(f"Successfully read {len(content)} characters from {upload.filename}")
                    # Add file metadata header for context
                    file_header = f"---\nFile: {upload.filename}\nType: {upload.content_type}\nSize: {upload.size} bytes\n---\n\n"
                    content = file_header + content
                except Exception as e:
                    logger.error(f"Failed to read file {upload.filename}: {e}")
                    raise FileProcessingError(f"Failed to read file {upload.filename}: {e}") from e
            
            # Use clear separators between files
            if idx > 1:
                combined_parts.append("\n" + "="*80 + "\n")
            
            combined_parts.append(f"FILE {idx}: {upload.filename}\n{content}")
        
        combined = "\n\n".join(combined_parts)
        logger.info(f"Combined {len(uploads)} files into {len(combined)} characters total")
        return combined
    
    @staticmethod
    def get_batch_content_type(uploads: List[FileUpload]) -> ContentType:
        """Determine content type for a batch of files"""
        if any(upload.content_type == "code" for upload in uploads):
            return "code"
        return "text"

