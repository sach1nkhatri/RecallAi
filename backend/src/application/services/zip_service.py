"""Zip file extraction and processing service"""

import logging
import re
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple

from src.config.settings import settings
from src.domain.exceptions import ValidationError, FileProcessingError

logger = logging.getLogger(__name__)


@dataclass
class ZipFile:
    """Represents a file from a zip archive"""
    path: str
    content: str
    size: int
    extension: str


@dataclass
class ZipIngestionResult:
    """Result of zip file ingestion"""
    included_files: List[ZipFile]
    skipped_files: List[str]
    total_files: int
    total_chars: int
    warnings: List[str]


class ZipService:
    """Service for extracting and processing zip files"""
    
    # Same ignored patterns as GitHubService
    IGNORED_PATTERNS = [
        r"node_modules",
        r"\.git",
        r"dist",
        r"build",
        r"\.next",
        r"venv",
        r"__pycache__",
        r"\.env",
        r"\.DS_Store",
        r"\.idea",
        r"\.vscode",
        r"\.pytest_cache",
        r"\.coverage",
        r"htmlcov",
        r"\.mypy_cache",
        r"\.tox",
        r"\.eggs",
        r"\.eggs-info",
        r"\.cache",
    ]
    
    def __init__(self):
        self.max_files = settings.GITHUB_MAX_REPO_FILES
        self.max_total_chars = settings.GITHUB_MAX_TOTAL_CHARS
        self.max_single_file = settings.GITHUB_MAX_SINGLE_FILE_SIZE
    
    def _should_ignore_path(self, path: str) -> bool:
        """Check if a file path should be ignored"""
        # Normalize path separators
        normalized_path = path.replace("\\", "/")
        
        for pattern in self.IGNORED_PATTERNS:
            if re.search(pattern, normalized_path, re.IGNORECASE):
                return True
        return False
    
    def _is_allowed_extension(self, filename: str) -> bool:
        """Check if file extension is in allowed list"""
        if "." not in filename:
            return False
        ext = filename.rsplit(".", 1)[1].lower()
        return ext in settings.ALLOWED_EXTENSIONS
    
    def extract_zip(self, zip_path: Path) -> ZipIngestionResult:
        """
        Extract and process zip file with same filtering as GitHub repos.
        
        Args:
            zip_path: Path to zip file
            
        Returns:
            ZipIngestionResult with processed files
        """
        if not zip_path.exists():
            raise FileProcessingError(f"Zip file not found: {zip_path}")
        
        included: List[ZipFile] = []
        skipped: List[str] = []
        warnings: List[str] = []
        total_chars = 0
        
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                file_list = zip_ref.namelist()
                logger.info(f"Extracting zip with {len(file_list)} entries")
                
                for file_path in file_list:
                    # Skip directories
                    if file_path.endswith('/'):
                        continue
                    
                    # Check ignored patterns
                    if self._should_ignore_path(file_path):
                        skipped.append(f"{file_path} (ignored pattern)")
                        continue
                    
                    # Check extension
                    if not self._is_allowed_extension(file_path):
                        skipped.append(f"{file_path} (unsupported extension)")
                        continue
                    
                    # Check file count limit
                    if len(included) >= self.max_files:
                        skipped.append(f"{file_path} (max files reached: {self.max_files})")
                        warnings.append(f"Reached maximum file limit ({self.max_files}). Some files were skipped.")
                        break
                    
                    try:
                        # Get file info
                        file_info = zip_ref.getinfo(file_path)
                        file_size = file_info.file_size
                        
                        # Check single file size
                        if file_size > self.max_single_file:
                            skipped.append(f"{file_path} (too large: {file_size} bytes)")
                            warnings.append(f"Skipped {file_path}: exceeds max file size ({self.max_single_file} bytes)")
                            continue
                        
                        # Check total character limit
                        if total_chars + file_size > self.max_total_chars:
                            skipped.append(f"{file_path} (total size limit reached)")
                            warnings.append(
                                f"Reached total size limit ({self.max_total_chars} chars). "
                                f"Processed {len(included)} files with {total_chars} characters."
                            )
                            break
                        
                        # Extract and read file content
                        try:
                            content = zip_ref.read(file_path).decode('utf-8', errors='ignore')
                            
                            # Extract extension
                            ext = file_path.rsplit(".", 1)[1].lower() if "." in file_path else ""
                            
                            zip_file = ZipFile(
                                path=file_path,
                                content=content,
                                size=len(content),
                                extension=ext
                            )
                            
                            included.append(zip_file)
                            total_chars += len(content)
                            
                        except UnicodeDecodeError:
                            skipped.append(f"{file_path} (encoding error)")
                            logger.warning(f"Failed to decode {file_path} as UTF-8")
                        except Exception as e:
                            skipped.append(f"{file_path} (read error: {str(e)})")
                            logger.warning(f"Failed to read {file_path}: {e}")
                    
                    except KeyError:
                        skipped.append(f"{file_path} (not found in zip)")
                        logger.warning(f"File {file_path} not found in zip")
                    except Exception as e:
                        skipped.append(f"{file_path} (error: {str(e)})")
                        logger.error(f"Error processing {file_path}: {e}")
        
        except zipfile.BadZipFile:
            raise ValidationError("Invalid zip file format")
        except Exception as e:
            raise FileProcessingError(f"Failed to extract zip file: {str(e)}") from e
        
        if not included:
            raise ValidationError(
                "No supported files found in zip archive. "
                "Ensure the zip contains code files with allowed extensions."
            )
        
        logger.info(
            f"Zip extraction complete: {len(included)} included, {len(skipped)} skipped, "
            f"{len(warnings)} warnings"
        )
        
        return ZipIngestionResult(
            included_files=included,
            skipped_files=skipped,
            total_files=len(included),
            total_chars=total_chars,
            warnings=warnings
        )
    
    def convert_to_repo_format(self, zip_result: ZipIngestionResult) -> List[dict]:
        """
        Convert zip files to the same format as GitHub repo files.
        
        Returns:
            List of dicts with 'path' and 'content' keys
        """
        return [
            {
                "path": file.path,
                "content": file.content
            }
            for file in zip_result.included_files
        ]

