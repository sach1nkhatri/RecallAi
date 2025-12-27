"""Repository scanning service for generating documentation outline"""

import logging
from dataclasses import dataclass
from typing import List, Optional

from src.application.interfaces.llm_client import LLMClient
from src.config.settings import settings
from src.domain.exceptions import ValidationError

logger = logging.getLogger(__name__)


@dataclass
class Chapter:
    """Represents a documentation chapter"""
    title: str
    description: str
    retrieval_queries: List[str]  # Queries to retrieve relevant chunks


class RepoScanService:
    """Service for scanning repository and generating documentation outline"""
    
    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client
    
    def scan_repository(
        self,
        repo_files: List[dict],  # List of {path, content}
        repo_name: str,
        owner: str
    ) -> List[Chapter]:
        """
        Scan repository and generate chapter outline with retrieval queries.
        
        Args:
            repo_files: List of dicts with 'path' and 'content' keys
            repo_name: Repository name
            owner: Repository owner
            
        Returns:
            List of Chapter objects
        """
        logger.info(f"Scanning repository {owner}/{repo_name} with {len(repo_files)} files")
        
        # Build repository summary
        file_summary = self._build_file_summary(repo_files)
        
        # Generate outline using LLM
        outline_prompt = self._build_outline_prompt(
            repo_name=repo_name,
            owner=owner,
            file_summary=file_summary,
            file_count=len(repo_files)
        )
        
        try:
            # Repository scanning can take longer with large repos and 14B models
            # Use extended timeout: 5 minutes (300 seconds) for scanning operations
            outline_text = self.llm_client.generate_documentation(
                content=outline_prompt,
                content_type="text",
                title=f"{repo_name} Documentation Outline",
                timeout=300  # 5 minutes for repository scanning
            )
            
            # Parse outline into chapters
            chapters = self._parse_outline(outline_text)
            
            logger.info(f"Generated {len(chapters)} chapters for documentation")
            return chapters
            
        except Exception as e:
            logger.exception("Failed to generate repository outline")
            raise ValidationError(f"Failed to scan repository: {str(e)}") from e
    
    def _build_file_summary(self, repo_files: List[dict]) -> str:
        """Build a summary of repository files"""
        summary_parts = []
        for file_info in repo_files[:50]:  # Limit to first 50 for summary
            path = file_info.get("path", "")
            content = file_info.get("content", "")
            lines = len(content.splitlines())
            summary_parts.append(f"- {path} ({lines} lines)")
        
        if len(repo_files) > 50:
            summary_parts.append(f"\n... and {len(repo_files) - 50} more files")
        
        return "\n".join(summary_parts)
    
    def _build_outline_prompt(
        self,
        repo_name: str,
        owner: str,
        file_summary: str,
        file_count: int
    ) -> str:
        """Build prompt for generating documentation outline"""
        return f"""Analyze this GitHub repository and generate a comprehensive documentation outline.

REPOSITORY: {owner}/{repo_name}
TOTAL FILES: {file_count}

FILE STRUCTURE:
{file_summary}

TASK: Generate a documentation outline with chapters and retrieval queries.

OUTPUT FORMAT (JSON-like structure):
{{
  "chapters": [
    {{
      "title": "Chapter Title",
      "description": "What this chapter covers",
      "queries": ["query 1", "query 2", "query 3"]
    }}
  ]
}}

REQUIREMENTS:
1. Create 5-10 logical chapters covering:
   - Overview/Introduction
   - Architecture/Design
   - Core Components/Modules
   - API/Interfaces
   - Configuration
   - Usage/Examples
   - Testing
   - Deployment
   - Contributing (if applicable)
   - Summary/Conclusion

2. For each chapter, provide 3-5 retrieval queries that would find relevant code chunks.
   - Queries should be specific and search for concepts, functions, classes, or patterns
   - Examples: "authentication middleware", "database connection setup", "API route handlers"

3. Base chapters on the actual file structure and content.

OUTPUT ONLY the JSON structure, no markdown formatting or explanations."""

    def _parse_outline(self, outline_text: str) -> List[Chapter]:
        """Parse LLM-generated outline into Chapter objects"""
        chapters = []
        
        # Try to extract JSON from response
        import json
        import re
        
        # Find JSON block
        json_match = re.search(r'\{[^{}]*"chapters"[^{}]*\[.*?\]\s*\}', outline_text, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group(0))
                for chapter_data in data.get("chapters", []):
                    chapters.append(Chapter(
                        title=chapter_data.get("title", "Untitled"),
                        description=chapter_data.get("description", ""),
                        retrieval_queries=chapter_data.get("queries", [])
                    ))
                return chapters
            except json.JSONDecodeError:
                logger.warning("Failed to parse JSON outline, using fallback")
        
        # Fallback: parse markdown-style outline
        lines = outline_text.split("\n")
        current_chapter = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Detect chapter title (## or ###)
            if line.startswith("##") and not line.startswith("###"):
                if current_chapter:
                    chapters.append(current_chapter)
                title = line.lstrip("#").strip()
                current_chapter = Chapter(
                    title=title,
                    description="",
                    retrieval_queries=[]
                )
            elif current_chapter:
                # Detect queries (lines starting with - or *)
                if line.startswith("-") or line.startswith("*"):
                    query = line.lstrip("-*").strip()
                    if query:
                        current_chapter.retrieval_queries.append(query)
                # Description is other text
                elif not line.startswith("#"):
                    if current_chapter.description:
                        current_chapter.description += " " + line
                    else:
                        current_chapter.description = line
        
        if current_chapter:
            chapters.append(current_chapter)
        
        # If no chapters found, create default structure
        if not chapters:
            logger.warning("No chapters parsed, using default structure")
            chapters = [
                Chapter(
                    title="Overview",
                    description="Repository overview and introduction",
                    retrieval_queries=["repository structure", "main entry point", "README"]
                ),
                Chapter(
                    title="Architecture",
                    description="System architecture and design",
                    retrieval_queries=["architecture", "design patterns", "system structure"]
                ),
                Chapter(
                    title="Core Components",
                    description="Main components and modules",
                    retrieval_queries=["main components", "core modules", "key classes"]
                ),
                Chapter(
                    title="API Reference",
                    description="API endpoints and interfaces",
                    retrieval_queries=["API routes", "endpoints", "interfaces"]
                ),
                Chapter(
                    title="Usage Examples",
                    description="Usage examples and tutorials",
                    retrieval_queries=["usage examples", "how to use", "tutorial"]
                )
            ]
        
        return chapters

