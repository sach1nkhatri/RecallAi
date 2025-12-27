"""GitHub repository ingestion service"""

import logging
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple
from urllib.parse import urlparse

import requests

from src.config.settings import settings
from src.domain.exceptions import ValidationError

logger = logging.getLogger(__name__)


@dataclass
class RepoFile:
    """Represents a file from a GitHub repository"""
    path: str
    url: str
    size: int
    sha: str
    extension: str


@dataclass
class RepoIngestionResult:
    """Result of repository ingestion"""
    repo_id: str
    owner: str
    repo_name: str
    included_files: List[RepoFile]
    skipped_files: List[str]
    total_files: int
    total_chars: int
    warnings: List[str]


class GitHubService:
    """Service for ingesting GitHub repositories"""
    
    # Ignored directories and files
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
    ]
    
    def __init__(self):
        self.api_base = settings.GITHUB_API_BASE
        self.token = settings.GITHUB_TOKEN
        self.session = requests.Session()
        if self.token:
            self.session.headers.update({
                "Authorization": f"token {self.token}",
                "Accept": "application/vnd.github.v3+json"
            })
        else:
            self.session.headers.update({
                "Accept": "application/vnd.github.v3+json"
            })
    
    def parse_repo_url(self, url: str) -> Tuple[str, str]:
        """
        Parse GitHub repository URL to extract owner and repo name.
        
        Supports:
        - https://github.com/owner/repo
        - https://github.com/owner/repo.git
        - git@github.com:owner/repo.git
        - owner/repo
        
        Returns:
            Tuple of (owner, repo_name)
        """
        url = url.strip()
        
        # Handle owner/repo format
        if "/" in url and "github.com" not in url and "@" not in url:
            parts = url.split("/")
            if len(parts) == 2:
                return parts[0], parts[1].replace(".git", "")
        
        # Handle git@github.com:owner/repo.git
        if url.startswith("git@") or url.startswith("ssh://"):
            match = re.search(r"[:/]([^/]+)/([^/]+?)(?:\.git)?$", url)
            if match:
                return match.group(1), match.group(2)
        
        # Handle https://github.com/owner/repo
        parsed = urlparse(url)
        if "github.com" in parsed.netloc or "github.com" in url:
            path = parsed.path.strip("/")
            parts = path.split("/")
            if len(parts) >= 2:
                owner = parts[0]
                repo = parts[1].replace(".git", "")
                return owner, repo
        
        raise ValidationError(
            f"Invalid GitHub repository URL: {url}. "
            "Expected format: https://github.com/owner/repo or owner/repo"
        )
    
    def _should_ignore_path(self, path: str) -> bool:
        """Check if a file path should be ignored"""
        for pattern in self.IGNORED_PATTERNS:
            if re.search(pattern, path, re.IGNORECASE):
                return True
        return False
    
    def _is_allowed_extension(self, filename: str) -> bool:
        """Check if file extension is in allowed list"""
        if "." not in filename:
            return False
        ext = filename.rsplit(".", 1)[1].lower()
        return ext in settings.ALLOWED_EXTENSIONS
    
    def fetch_repo_tree(self, owner: str, repo: str, branch: str = "main") -> List[dict]:
        """
        Fetch repository tree recursively.
        
        Returns:
            List of file objects from GitHub API
        """
        try:
            # Get default branch if not specified
            if not branch or branch == "main":
                repo_info_url = f"{self.api_base}/repos/{owner}/{repo}"
                repo_resp = self.session.get(
                    repo_info_url,
                    timeout=settings.GITHUB_TIMEOUT
                )
                repo_resp.raise_for_status()
                repo_data = repo_resp.json()
                branch = repo_data.get("default_branch", "main")
            
            # Get tree SHA
            branch_url = f"{self.api_base}/repos/{owner}/{repo}/branches/{branch}"
            branch_resp = self.session.get(branch_url, timeout=settings.GITHUB_TIMEOUT)
            branch_resp.raise_for_status()
            branch_data = branch_resp.json()
            tree_sha = branch_data["commit"]["commit"]["tree"]["sha"]
            
            # Get recursive tree
            tree_url = f"{self.api_base}/repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1"
            tree_resp = self.session.get(tree_url, timeout=settings.GITHUB_TIMEOUT)
            tree_resp.raise_for_status()
            tree_data = tree_resp.json()
            
            return tree_data.get("tree", [])
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                raise ValidationError(
                    f"Repository {owner}/{repo} not found or is private. "
                    "Ensure the repository is public or provide a GitHub token."
                ) from e
            elif e.response.status_code == 403:
                raise ValidationError(
                    "GitHub API rate limit exceeded. "
                    "Set GITHUB_TOKEN environment variable to increase limits."
                ) from e
            raise ValidationError(f"Failed to fetch repository: {str(e)}") from e
        except requests.exceptions.Timeout:
            raise ValidationError(
                f"Timeout fetching repository from GitHub (>{settings.GITHUB_TIMEOUT}s). "
                "The repository may be too large."
            )
        except requests.exceptions.RequestException as e:
            raise ValidationError(f"Failed to connect to GitHub API: {str(e)}") from e
    
    def filter_and_validate_files(
        self,
        tree_items: List[dict],
        max_files: int,
        max_total_chars: int,
        max_single_file: int
    ) -> Tuple[List[RepoFile], List[str], List[str]]:
        """
        Filter files by extension and size limits.
        
        Returns:
            Tuple of (included_files, skipped_files, warnings)
        """
        included: List[RepoFile] = []
        skipped: List[str] = []
        warnings: List[str] = []
        
        total_chars = 0
        
        for item in tree_items:
            if item.get("type") != "blob":  # Only files, not directories
                continue
            
            path = item.get("path", "")
            size = item.get("size", 0)
            
            # Check ignored patterns
            if self._should_ignore_path(path):
                skipped.append(f"{path} (ignored pattern)")
                continue
            
            # Check extension
            if not self._is_allowed_extension(path):
                skipped.append(f"{path} (unsupported extension)")
                continue
            
            # Check single file size
            if size > max_single_file:
                skipped.append(f"{path} (too large: {size} bytes)")
                warnings.append(f"Skipped {path}: exceeds max file size ({max_single_file} bytes)")
                continue
            
            # Check total file count
            if len(included) >= max_files:
                skipped.append(f"{path} (max files reached: {max_files})")
                warnings.append(f"Reached maximum file limit ({max_files}). Some files were skipped.")
                break
            
            # Check total character limit (estimate: 1 char ≈ 1 byte for text)
            if total_chars + size > max_total_chars:
                skipped.append(f"{path} (total size limit reached)")
                warnings.append(
                    f"Reached total size limit ({max_total_chars} chars). "
                    f"Processed {len(included)} files with {total_chars} characters."
                )
                break
            
            # Extract extension
            ext = path.rsplit(".", 1)[1].lower() if "." in path else ""
            
            repo_file = RepoFile(
                path=path,
                url=item.get("url", ""),
                size=size,
                sha=item.get("sha", ""),
                extension=ext
            )
            
            included.append(repo_file)
            total_chars += size
        
        return included, skipped, warnings
    
    def download_file_content(self, file: RepoFile) -> str:
        """Download file content from GitHub"""
        try:
            resp = self.session.get(file.url, timeout=settings.GITHUB_TIMEOUT)
            resp.raise_for_status()
            file_data = resp.json()
            
            # GitHub API returns base64 encoded content
            import base64
            content = base64.b64decode(file_data.get("content", "")).decode("utf-8", errors="ignore")
            return content
            
        except requests.exceptions.Timeout:
            raise ValidationError(f"Timeout downloading file {file.path}")
        except Exception as e:
            logger.error(f"Failed to download {file.path}: {e}")
            raise ValidationError(f"Failed to download file {file.path}: {str(e)}") from e
    
    def ingest_repository(self, repo_url: str) -> RepoIngestionResult:
        """
        Ingest a GitHub repository.
        
        Args:
            repo_url: GitHub repository URL or owner/repo format
            
        Returns:
            RepoIngestionResult with file information
        """
        logger.info(f"Ingesting repository: {repo_url}")
        
        # Parse URL
        owner, repo_name = self.parse_repo_url(repo_url)
        logger.info(f"Parsed: owner={owner}, repo={repo_name}")
        
        # Fetch tree
        tree_items = self.fetch_repo_tree(owner, repo_name)
        logger.info(f"Fetched {len(tree_items)} items from repository")
        
        # Filter files
        included, skipped, warnings = self.filter_and_validate_files(
            tree_items,
            max_files=settings.GITHUB_MAX_REPO_FILES,
            max_total_chars=settings.GITHUB_MAX_TOTAL_CHARS,
            max_single_file=settings.GITHUB_MAX_SINGLE_FILE_SIZE
        )
        
        logger.info(
            f"Filtered: {len(included)} included, {len(skipped)} skipped, "
            f"{len(warnings)} warnings"
        )
        
        # Generate repo_id
        repo_id = f"{owner}_{repo_name}_{int(time.time())}"
        
        total_chars = sum(f.size for f in included)
        
        return RepoIngestionResult(
            repo_id=repo_id,
            owner=owner,
            repo_name=repo_name,
            included_files=included,
            skipped_files=skipped,
            total_files=len(included),
            total_chars=total_chars,
            warnings=warnings
        )

