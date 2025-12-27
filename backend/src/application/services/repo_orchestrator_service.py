"""Repository documentation orchestrator service"""

import logging
import time
from pathlib import Path
from typing import Optional, Callable

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
        repo_doc_service: RepoDocService,
        status_callback: Optional[Callable] = None
    ):
        self.llm_client = llm_client
        self.pdf_generator = pdf_generator
        self.github_service = github_service
        self.repo_scan_service = repo_scan_service
        self.rag_index_service = rag_index_service
        self.repo_doc_service = repo_doc_service
        self.status_callback = status_callback  # Callback to report status updates
    
    def ingest_repository(self, repo_url: str) -> RepoIngestionResult:
        """
        Step 1: Ingest repository from GitHub.
        
        Returns:
            RepoIngestionResult with file information
        """
        logger.info(f"Ingesting repository: {repo_url}")
        return self.github_service.ingest_repository(repo_url)
    
    def _report_status(
        self,
        status: str,
        progress: int,
        current_step: str,
        repo_url: Optional[str] = None,
        repo_id: Optional[str] = None,
        repo_info: Optional[dict] = None,
        total_steps: int = 0,
        completed_steps: int = 0
    ):
        """Report status update via callback if available"""
        if self.status_callback:
            try:
                self.status_callback(
                    status=status,
                    progress=progress,
                    current_step=current_step,
                    type="github_repo",
                    repo_url=repo_url,
                    repo_id=repo_id,
                    repo_info=repo_info,
                    total_steps=total_steps,
                    completed_steps=completed_steps
                )
            except Exception as e:
                logger.debug(f"Status callback failed (non-critical): {e}")
    
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
        
        # Report initial status
        self._report_status(
            status="pending",
            progress=0,
            current_step="Starting generation...",
            repo_url=repo_url,
            repo_id=repo_id
        )
        
        # Step 1: Ingest repository
        self._report_status(
            status="ingesting",
            progress=5,
            current_step="Ingesting repository files...",
            repo_url=repo_url,
            repo_id=repo_id
        )
        ingestion_result = self.ingest_repository(repo_url)
        logger.info(f"Ingested {ingestion_result.total_files} files")
        
        # Step 2: Download file contents
        self._report_status(
            status="ingesting",
            progress=10,
            current_step=f"Downloading {len(ingestion_result.included_files)} files...",
            repo_url=repo_url,
            repo_id=repo_id,
            repo_info={
                "totalFiles": ingestion_result.total_files,
                "includedFiles": len(ingestion_result.included_files),
                "skippedFiles": len(ingestion_result.skipped_files)
            }
        )
        logger.info(f"Downloading {len(ingestion_result.included_files)} files...")
        repo_files = []
        total_files = len(ingestion_result.included_files)
        for idx, file_info in enumerate(ingestion_result.included_files, 1):
            try:
                logger.debug(f"Downloading file {idx}/{total_files}: {file_info.path}")
                content = self.github_service.download_file_content(file_info)
                repo_files.append({
                    "path": file_info.path,
                    "content": content
                })
                # Update progress during download
                if idx % 5 == 0 or idx == total_files:  # Update every 5 files
                    progress = 10 + int((idx / total_files) * 10)  # 10-20%
                    self._report_status(
                        status="ingesting",
                        progress=progress,
                        current_step=f"Downloaded {idx}/{total_files} files...",
                        repo_url=repo_url,
                        repo_id=repo_id
                    )
            except Exception as e:
                logger.warning(f"Failed to download {file_info.path}: {e}")
                continue
        logger.info(f"Downloaded {len(repo_files)} files successfully")
        
        if not repo_files:
            raise ValidationError("No files could be downloaded from repository")
        
        # Step 3: Scan repository and generate outline
        self._report_status(
            status="scanning",
            progress=20,
            current_step="Scanning repository and generating outline...",
            repo_url=repo_url,
            repo_id=repo_id
        )
        logger.info("Starting repository scan and outline generation (this may take 2-5 minutes)...")
        chapters = self.repo_scan_service.scan_repository(
            repo_files=repo_files,
            repo_name=ingestion_result.repo_name,
            owner=ingestion_result.owner
        )
        logger.info(f"Repository scan completed. Generated {len(chapters)} chapters")
        
        self._report_status(
            status="scanning",
            progress=30,
            current_step=f"Generated {len(chapters)} chapters outline",
            repo_url=repo_url,
            repo_id=repo_id,
            total_steps=len(chapters) + 3,  # +3 for scan, index, merge
            completed_steps=1
        )
        
        # Step 4: Build RAG index
        self._report_status(
            status="indexing",
            progress=35,
            current_step=f"Building RAG index for {len(repo_files)} files...",
            repo_url=repo_url,
            repo_id=repo_id,
            total_steps=len(chapters) + 3,
            completed_steps=2
        )
        logger.info(f"Building RAG index for {len(repo_files)} files (this may take several minutes)...")
        index_path, metadata = self.rag_index_service.build_repo_index(
            repo_id=repo_id,
            repo_files=repo_files
        )
        logger.info(f"RAG index built successfully with {len(metadata)} chunks")
        
        self._report_status(
            status="indexing",
            progress=45,
            current_step=f"RAG index built with {len(metadata)} chunks",
            repo_url=repo_url,
            repo_id=repo_id,
            total_steps=len(chapters) + 3,
            completed_steps=3
        )
        
        # Step 5: Generate documentation chapter by chapter
        self._report_status(
            status="generating",
            progress=50,
            current_step=f"Generating documentation for {len(chapters)} chapters...",
            repo_url=repo_url,
            repo_id=repo_id,
            total_steps=len(chapters) + 3,
            completed_steps=3
        )
        logger.info(f"Generating documentation for {len(chapters)} chapters (this may take 5-10 minutes)...")
        doc_title = title or f"{ingestion_result.repo_name} Documentation"
        
        # Generate with progress updates
        markdown = self.repo_doc_service.generate_documentation(
            chapters=chapters,
            index_path=index_path,
            repo_name=ingestion_result.repo_name,
            owner=ingestion_result.owner,
            progress_callback=lambda chapter_num, total: self._report_status(
                status="generating",
                progress=50 + int((chapter_num / total) * 40),  # 50-90%
                current_step=f"Generating chapter {chapter_num}/{total}...",
                repo_url=repo_url,
                repo_id=repo_id,
                total_steps=total + 3,
                completed_steps=3 + chapter_num
            )
        )
        logger.info(f"Documentation generation completed. Generated {len(markdown)} characters")
        
        # Step 6: Generate PDF
        self._report_status(
            status="merging",
            progress=90,
            current_step="Generating PDF...",
            repo_url=repo_url,
            repo_id=repo_id,
            total_steps=len(chapters) + 3,
            completed_steps=len(chapters) + 3
        )
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
        
        # Report completion
        if self.status_callback:
            try:
                self.status_callback(
                    status="completed",
                    progress=100,
                    current_step="Completed",
                    type="github_repo",
                    repo_url=repo_url,
                    repo_id=repo_id,
                    markdown=markdown,
                    pdf_url=pdf_url,
                    pdf_info={"filename": pdf_filename} if pdf_url else None
                )
            except Exception as e:
                logger.debug(f"Completion status callback failed (non-critical): {e}")
        
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

