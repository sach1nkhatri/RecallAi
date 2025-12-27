"""Repository documentation orchestrator service"""

import logging
import time
from pathlib import Path
from typing import Optional

from src.application.interfaces.llm_client import LLMClient
from src.application.interfaces.pdf_generator import PDFGenerator
from src.application.services.github_service import GitHubService, RepoIngestionResult
from src.application.services.rag_index_service import RAGIndexService
from src.application.services.repo_doc_service import RepoDocService
from src.application.services.repo_scan_service import RepoScanService
from src.config.settings import settings
from src.domain.exceptions import ValidationError

logger = logging.getLogger(__name__)


class RepoOrchestratorService:
    """Orchestrates the complete repository-to-documentation pipeline"""
    
    def __init__(
        self,
        llm_client: LLMClient,
        pdf_generator: PDFGenerator,
        github_service: GitHubService,
        repo_scan_service: RepoScanService,
        rag_index_service: RAGIndexService,
        repo_doc_service: RepoDocService
    ):
        self.llm_client = llm_client
        self.pdf_generator = pdf_generator
        self.github_service = github_service
        self.repo_scan_service = repo_scan_service
        self.rag_index_service = rag_index_service
        self.repo_doc_service = repo_doc_service
    
    def ingest_repository(self, repo_url: str) -> RepoIngestionResult:
        """
        Step 1: Ingest repository from GitHub.
        
        Returns:
            RepoIngestionResult with file information
        """
        logger.info(f"Ingesting repository: {repo_url}")
        return self.github_service.ingest_repository(repo_url)
    
    def generate_documentation(
        self,
        repo_id: str,
        repo_url: str,
        title: Optional[str] = None
    ) -> dict:
        """
        Complete pipeline: ingest → scan → index → generate → PDF.
        
        Args:
            repo_id: Repository identifier from ingestion
            repo_url: GitHub repository URL
            title: Optional document title
            
        Returns:
            Dict with markdown, pdf_path, pdf_url, chapters
        """
        logger.info(f"Starting documentation generation for repo {repo_id}")
        start_time = time.time()
        
        # Step 1: Ingest repository
        ingestion_result = self.ingest_repository(repo_url)
        logger.info(f"Ingested {ingestion_result.total_files} files")
        
        # Step 2: Download file contents
        logger.info(f"Downloading {len(ingestion_result.included_files)} files...")
        repo_files = []
        for idx, file_info in enumerate(ingestion_result.included_files, 1):
            try:
                logger.debug(f"Downloading file {idx}/{len(ingestion_result.included_files)}: {file_info.path}")
                content = self.github_service.download_file_content(file_info)
                repo_files.append({
                    "path": file_info.path,
                    "content": content
                })
            except Exception as e:
                logger.warning(f"Failed to download {file_info.path}: {e}")
                continue
        logger.info(f"Downloaded {len(repo_files)} files successfully")
        
        if not repo_files:
            raise ValidationError("No files could be downloaded from repository")
        
        # Step 3: Scan repository and generate outline
        logger.info("Starting repository scan and outline generation (this may take 2-5 minutes)...")
        chapters = self.repo_scan_service.scan_repository(
            repo_files=repo_files,
            repo_name=ingestion_result.repo_name,
            owner=ingestion_result.owner
        )
        logger.info(f"Repository scan completed. Generated {len(chapters)} chapters")
        
        # Step 4: Build RAG index
        logger.info(f"Building RAG index for {len(repo_files)} files (this may take several minutes)...")
        index_path, metadata = self.rag_index_service.build_repo_index(
            repo_id=repo_id,
            repo_files=repo_files
        )
        logger.info(f"RAG index built successfully with {len(metadata)} chunks")
        
        # Step 5: Generate documentation chapter by chapter
        logger.info(f"Generating documentation for {len(chapters)} chapters (this may take 5-10 minutes)...")
        doc_title = title or f"{ingestion_result.repo_name} Documentation"
        markdown = self.repo_doc_service.generate_documentation(
            chapters=chapters,
            index_path=index_path,
            repo_name=ingestion_result.repo_name,
            owner=ingestion_result.owner
        )
        logger.info(f"Documentation generation completed. Generated {len(markdown)} characters")
        
        # Step 6: Generate PDF
        timestamp = int(time.time())
        pdf_filename = f"repo-doc-{repo_id}-{timestamp}.pdf"
        pdf_path = settings.UPLOAD_PATH / pdf_filename
        
        try:
            self.pdf_generator.generate_from_markdown(
                markdown=markdown,
                output_path=pdf_path
            )
            pdf_url = f"/uploads/{pdf_filename}"
            logger.info(f"Generated PDF: {pdf_path}")
        except Exception as e:
            logger.exception("PDF generation failed")
            pdf_url = None
        
        duration = time.time() - start_time
        logger.info(f"Documentation generation completed in {duration:.2f}s")
        
        return {
            "markdown": markdown,
            "pdf_path": str(pdf_path) if pdf_path.exists() else None,
            "pdf_url": pdf_url,
            "chapters": [
                {
                    "title": ch.title,
                    "description": ch.description,
                    "queries": ch.retrieval_queries
                }
                for ch in chapters
            ],
            "repo_info": {
                "owner": ingestion_result.owner,
                "repo_name": ingestion_result.repo_name,
                "total_files": ingestion_result.total_files,
                "total_chars": ingestion_result.total_chars
            },
            "duration_seconds": round(duration, 2)
        }

