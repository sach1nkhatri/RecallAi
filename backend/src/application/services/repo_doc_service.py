"""Repository documentation generation service"""

import logging
import time
from typing import List, Optional, Callable

from src.application.interfaces.llm_client import LLMClient
from src.application.interfaces.pdf_generator import PDFGenerator
from src.application.services.rag_index_service import RAGIndexService
from src.application.services.repo_scan_service import Chapter
from src.config.settings import settings
from src.domain.exceptions import ValidationError

logger = logging.getLogger(__name__)


class RepoDocService:
    """Service for generating documentation from repository using RAG"""
    
    def __init__(
        self,
        llm_client: LLMClient,
        pdf_generator: PDFGenerator,
        rag_index_service: RAGIndexService
    ):
        self.llm_client = llm_client
        self.pdf_generator = pdf_generator
        self.rag_index_service = rag_index_service
    
    def generate_chapter(
        self,
        chapter: Chapter,
        index_path: str,
        repo_name: str,
        chapter_number: int,
        total_chapters: int
    ) -> str:
        """
        Generate a single chapter using RAG.
        
        Args:
            chapter: Chapter definition with queries
            index_path: Path to RAG index
            repo_name: Repository name
            chapter_number: Current chapter number
            total_chapters: Total number of chapters
            
        Returns:
            Markdown content for the chapter
        """
        logger.info(f"Generating chapter {chapter_number}/{total_chapters}: {chapter.title}")
        logger.info(f"Retrieval queries for '{chapter.title}': {chapter.retrieval_queries}")
        
        # Retrieve relevant chunks
        chunks = self.rag_index_service.query_index(
            index_path,
            chapter.retrieval_queries,
            top_k=settings.RAG_TOP_K
        )
        
        logger.info(f"Retrieved {len(chunks)} chunks for chapter '{chapter.title}'")
        if chunks:
            logger.debug(f"Sample chunk files: {[c.get('file_path', 'unknown')[:50] for c in chunks[:3]]}")
        
        if not chunks:
            logger.warning(f"No chunks found for chapter: {chapter.title} with queries: {chapter.retrieval_queries}")
            logger.warning("Attempting fallback: getting random chunks from index...")
            
            # Fallback: Get random chunks from the index if queries fail
            try:
                import random
                from src.infrastructure.external.rag.vectorstore import load_metadata
                metadata = load_metadata(index_path)
                if metadata and len(metadata) > 0:
                    # Get random chunks (up to top_k)
                    random_chunks = random.sample(metadata, min(settings.RAG_TOP_K, len(metadata)))
                    logger.info(f"Fallback: Using {len(random_chunks)} random chunks for chapter '{chapter.title}'")
                    chunks = random_chunks
            except Exception as e:
                logger.error(f"Fallback failed: {e}")
            
            if not chunks:
                logger.error("No chunks available even with fallback!")
                return f"## {chapter.title}\n\n*No relevant content found for this chapter.*\n"
        
        # Build context from chunks
        context_parts = []
        for chunk in chunks:
            file_path = chunk.get("file_path", "unknown")
            text = chunk.get("text", "")
            context_parts.append(f"**File:** `{file_path}`\n\n{text}\n\n---\n")
        
        context = "\n".join(context_parts)
        
        # Generate chapter content
        prompt = self._build_chapter_prompt(
            chapter=chapter,
            context=context,
            repo_name=repo_name,
            chapter_number=chapter_number,
            total_chapters=total_chapters
        )
        
        try:
            # Chapter generation can also take time with 14B models
            # Use extended timeout: 45 minutes (2700 seconds) to allow for slow 14B model generation
            markdown = self.llm_client.generate_documentation(
                content=prompt,
                content_type="code",
                title=chapter.title,
                timeout=2700  # 45 minutes for chapter generation (14B models can be slow)
            )
            
            # Ensure chapter has proper heading
            if not markdown.strip().startswith("#"):
                markdown = f"## {chapter.title}\n\n{markdown}"
            
            return markdown
            
        except Exception as e:
            logger.exception(f"Failed to generate chapter: {chapter.title}")
            return f"## {chapter.title}\n\n*Error generating content: {str(e)}*\n"
    
    def generate_documentation(
        self,
        chapters: List[Chapter],
        index_path: str,
        repo_name: str,
        owner: str,
        progress_callback: Optional[Callable[[int, int], None]] = None
    ) -> str:
        """
        Generate complete documentation from chapters.
        
        Args:
            chapters: List of chapter definitions
            index_path: Path to RAG index
            repo_name: Repository name
            owner: Repository owner
            
        Returns:
            Complete markdown documentation
        """
        logger.info(f"Generating documentation for {owner}/{repo_name} with {len(chapters)} chapters")
        
        # Generate title page
        title_page = f"""# {repo_name} Documentation

**Repository:** {owner}/{repo_name}  
**Generated:** {time.strftime("%Y-%m-%d %H:%M:%S")}

---

## Table of Contents

"""
        for idx, chapter in enumerate(chapters, 1):
            title_page += f"{idx}. [{chapter.title}](#{chapter.title.lower().replace(' ', '-')})\n"
        
        title_page += "\n---\n\n"
        
        # Generate each chapter
        chapter_contents = []
        for idx, chapter in enumerate(chapters, 1):
            # Report progress if callback provided
            if progress_callback:
                progress_callback(idx, len(chapters))
            
            chapter_md = self.generate_chapter(
                chapter=chapter,
                index_path=index_path,
                repo_name=repo_name,
                chapter_number=idx,
                total_chapters=len(chapters)
            )
            chapter_contents.append(chapter_md)
        
        # Combine all chapters
        full_doc = title_page + "\n\n".join(chapter_contents)
        
        logger.info(f"Generated documentation with {len(full_doc)} characters")
        return full_doc
    
    def _build_chapter_prompt(
        self,
        chapter: Chapter,
        context: str,
        repo_name: str,
        chapter_number: int,
        total_chapters: int
    ) -> str:
        """Build prompt for generating a single chapter"""
        return f"""Generate comprehensive documentation for the following chapter.

CHAPTER: {chapter.title} ({chapter_number} of {total_chapters})
DESCRIPTION: {chapter.description}

REPOSITORY: {repo_name}

CONTEXT (relevant code chunks retrieved from repository):
{context}

TASK: Write a detailed, professional documentation chapter covering:
- {chapter.description}
- All relevant code examples and explanations
- Clear structure with subsections
- Code blocks with proper syntax highlighting
- Practical examples where applicable

REQUIREMENTS:
- Use proper markdown formatting
- Include code examples from the context
- Be thorough but concise
- Maintain professional technical writing style
- Do not invent information not present in the context

OUTPUT: Complete markdown chapter content starting with ## {chapter.title}"""

