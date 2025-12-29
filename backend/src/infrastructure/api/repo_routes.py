"""Repository documentation API routes"""

import logging
import os
from pathlib import Path
from typing import Optional

from flask import Flask, jsonify, request

from src.application.services.github_service import GitHubService
from src.application.services.rag_index_service import RAGIndexService
from src.application.services.repo_doc_service import RepoDocService
from src.application.services.repo_orchestrator_service import RepoOrchestratorService
from src.application.services.repo_scan_service import RepoScanService
from src.config.settings import settings
from src.domain.exceptions import ValidationError
from src.infrastructure.external import LMStudioClient, FPDFGenerator
from src.infrastructure.external.status_reporter import StatusReporter
from src.infrastructure.external.user_service import UserService

logger = logging.getLogger(__name__)


def register_repo_routes(app: Flask):
    """Register repository-related routes"""
    
    # Initialize services
    llm_client = LMStudioClient()
    pdf_generator = FPDFGenerator()
    github_service = GitHubService()
    repo_scan_service = RepoScanService(llm_client)
    rag_index_service = RAGIndexService(settings.LM_STUDIO_BASE_URL)
    repo_doc_service = RepoDocService(llm_client, pdf_generator, rag_index_service)
    status_reporter = StatusReporter(settings.NODE_BACKEND_URL)
    user_service = UserService(settings.NODE_BACKEND_URL)
    
    def status_callback(**kwargs):
        """Callback to report status updates to Node backend"""
        # Get auth token from request headers if available
        token = None
        try:
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ', 1)[1]
        except Exception:
            pass
        
        # Report status update
        status_reporter.report_progress(
            status=kwargs.get('status', 'pending'),
            progress=kwargs.get('progress', 0),
            current_step=kwargs.get('current_step', ''),
            token=token,
            type=kwargs.get('type', 'github_repo'),
            repo_url=kwargs.get('repo_url'),
            repo_id=kwargs.get('repo_id'),
            repo_info=kwargs.get('repo_info'),
            file_count=kwargs.get('file_count', 0),
            total_steps=kwargs.get('total_steps', 0),
            completed_steps=kwargs.get('completed_steps', 0)
        )
        
        # If completed, report completion with markdown
        if kwargs.get('status') == 'completed':
            status_reporter.report_completion(
                markdown=kwargs.get('markdown', ''),
                pdf_url=kwargs.get('pdf_url'),
                pdf_info=kwargs.get('pdf_info'),
                token=token
            )
    
    orchestrator = RepoOrchestratorService(
        llm_client=llm_client,
        pdf_generator=pdf_generator,
        github_service=github_service,
        repo_scan_service=repo_scan_service,
        rag_index_service=rag_index_service,
        repo_doc_service=repo_doc_service,
        status_callback=status_callback
    )
    
    @app.route("/api/repo/ingest", methods=["POST"])
    def ingest_repo():
        """Ingest a GitHub repository"""
        try:
            data = request.get_json() or {}
            repo_url = data.get("repo_url", "").strip()
            
            if not repo_url:
                return jsonify({"error": "repo_url is required"}), 400
            
            # Ingest repository
            result = github_service.ingest_repository(repo_url)
            
            return jsonify({
                "repo_id": result.repo_id,
                "owner": result.owner,
                "repo_name": result.repo_name,
                "included_files": [
                    {
                        "path": f.path,
                        "size": f.size,
                        "extension": f.extension
                    }
                    for f in result.included_files
                ],
                "skipped_files": result.skipped_files[:50],  # Limit response size
                "total_files": result.total_files,
                "total_chars": result.total_chars,
                "warnings": result.warnings
            }), 200
            
        except ValidationError as e:
            logger.warning(f"Validation error: {e}")
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            logger.exception("Repository ingestion failed")
            include_trace = bool(os.environ.get("DEBUG_TRACE", "").lower() in {"1", "true", "yes"})
            error_msg = str(e)
            if include_trace:
                import traceback
                error_msg += f"\n{traceback.format_exc()}"
            return jsonify({"error": error_msg}), 500
    
    @app.route("/api/repo/generate", methods=["POST"])
    def generate_repo_doc():
        """Generate documentation from a GitHub repository"""
        try:
            data = request.get_json() or {}
            repo_url = data.get("repo_url", "").strip()
            repo_id = data.get("repo_id", "").strip()
            title = data.get("title", "").strip() or None
            
            logger.info(f"Generate request - repo_url: {repo_url}, repo_id: {repo_id}")
            
            if not repo_url:
                logger.warning("Missing repo_url in generate request")
                return jsonify({"error": "repo_url is required"}), 400
            
            # If repo_id not provided, ingest first
            if not repo_id:
                logger.info(f"repo_id not provided, ingesting repository: {repo_url}")
                ingestion = github_service.ingest_repository(repo_url)
                repo_id = ingestion.repo_id
                logger.info(f"Ingested repository, got repo_id: {repo_id}")
            else:
                # Validate repo_id format
                if not repo_id or len(repo_id) < 3:
                    logger.warning(f"Invalid repo_id format: {repo_id}")
                    return jsonify({"error": "Invalid repo_id format"}), 400
            
            # Get auth token from request headers for status reporting
            token = None
            try:
                auth_header = request.headers.get('Authorization', '')
                if auth_header.startswith('Bearer '):
                    token = auth_header.split(' ', 1)[1]
            except Exception:
                pass
            
            # Check usage limit before generating
            if token:
                can_proceed, usage_info, error_msg = user_service.check_usage_limit(token, "codeToDoc")
                if not can_proceed:
                    logger.warning(f"Usage limit reached for codeToDoc: {error_msg}")
                    return jsonify({"error": error_msg}), 403
            
            # Create a request-specific status callback that captures the token
            def request_status_callback(**kwargs):
                """Status callback with captured token from request"""
                # Report status update
                status_reporter.report_progress(
                    status=kwargs.get('status', 'pending'),
                    progress=kwargs.get('progress', 0),
                    current_step=kwargs.get('current_step', ''),
                    token=token,  # Use captured token
                    type=kwargs.get('type', 'github_repo'),
                    repo_url=kwargs.get('repo_url'),
                    repo_id=kwargs.get('repo_id'),
                    repo_info=kwargs.get('repo_info'),
                    file_count=kwargs.get('file_count', 0),
                    total_steps=kwargs.get('total_steps', 0),
                    completed_steps=kwargs.get('completed_steps', 0)
                )
                
                # If completed, report completion with markdown
                if kwargs.get('status') == 'completed':
                    status_reporter.report_completion(
                        markdown=kwargs.get('markdown', ''),
                        pdf_url=kwargs.get('pdf_url'),
                        pdf_info=kwargs.get('pdf_info'),
                        token=token
                    )
            
            # Create orchestrator with request-specific status callback
            request_orchestrator = RepoOrchestratorService(
                llm_client=llm_client,
                pdf_generator=pdf_generator,
                github_service=github_service,
                repo_scan_service=repo_scan_service,
                rag_index_service=rag_index_service,
                repo_doc_service=repo_doc_service,
                status_callback=request_status_callback
            )
            
            # Generate documentation (status updates are handled by orchestrator)
            try:
                result = request_orchestrator.generate_documentation(
                    repo_id=repo_id,
                    repo_url=repo_url,
                    title=title
                )
                
                # Increment usage after successful generation
                if token:
                    user_service.increment_usage(token, "codeToDoc", 1)
                    
            except Exception as e:
                # Report error to Node backend
                try:
                    status_reporter.report_error(
                        error_message=str(e),
                        token=token
                    )
                except Exception:
                    pass  # Don't fail if status reporting fails
                raise  # Re-raise the original exception
            
            return jsonify({
                "success": True,
                "output": result["markdown"],
                "docText": result["markdown"],  # Backward compatibility
                "pdfFilename": Path(result["pdf_path"]).name if result["pdf_path"] else None,
                "pdfPath": result["pdf_url"],
                "pdfUrl": result["pdf_url"],
                "chapters": result["chapters"],
                "repo_info": result["repo_info"],
                "duration_seconds": result["duration_seconds"]
            }), 200
            
        except ValidationError as e:
            logger.warning(f"Validation error in repo/generate: {e}", exc_info=True)
            return jsonify({"error": str(e)}), 400
        except RuntimeError as e:
            logger.error(f"Runtime error: {e}")
            return jsonify({"error": str(e)}), 500
        except Exception as e:
            logger.exception("Repository documentation generation failed")
            include_trace = bool(os.environ.get("DEBUG_TRACE", "").lower() in {"1", "true", "yes"})
            error_msg = str(e)
            if include_trace:
                import traceback
                error_msg += f"\n{traceback.format_exc()}"
            return jsonify({"error": error_msg}), 500

