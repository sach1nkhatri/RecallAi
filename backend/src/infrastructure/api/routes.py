"""Flask API routes"""

import logging
import os
import traceback
from pathlib import Path
from typing import Optional

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import requests

from src.config.settings import settings
from src.domain.models import DocumentGeneration, ContentType
from src.domain.exceptions import ValidationError, FileProcessingError
from src.application.services.file_service import FileService
from src.application.services.document_service import DocumentService
from src.application.services.zip_service import ZipService
from src.infrastructure.external import LMStudioClient, FPDFGenerator
from src.infrastructure.external.status_reporter import StatusReporter
from src.infrastructure.external.user_service import UserService
from src.infrastructure.api.bot_routes import register_bot_routes
from src.infrastructure.api.user_routes import register_user_routes
from src.infrastructure.api.repo_routes import register_repo_routes
from src.infrastructure.storage.database import get_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s"
)
logger = logging.getLogger(__name__)


def _error_response(message: str, status: int = 500, include_trace: bool = False):
    """Create standardized error response"""
    payload: dict[str, str] = {"error": message}
    if include_trace:
        payload["trace"] = traceback.format_exc()
    return jsonify(payload), status


def create_app() -> Flask:
    """Create and configure Flask application"""
    # Ensure directories exist
    settings.ensure_directories()
    
    # Initialize MongoDB connection
    try:
        get_client()  # This will test the connection
        logger.info("MongoDB connection initialized")
    except Exception as e:
        logger.warning(f"MongoDB connection failed: {e}. Bot storage may not work correctly.")
    
    # Initialize services
    llm_client = LMStudioClient()
    pdf_generator = FPDFGenerator()
    document_service = DocumentService(llm_client, pdf_generator)
    file_service = FileService()
    zip_service = ZipService()
    status_reporter = StatusReporter(settings.NODE_BACKEND_URL)
    user_service = UserService(settings.NODE_BACKEND_URL)
    
    # Create Flask app
    app = Flask(__name__, static_folder=str(settings.FRONTEND_DIR), static_url_path="")
    CORS(app)
    
    @app.route("/api/health", methods=["GET"])
    def health() -> tuple[dict, int]:
        """Health check endpoint with system information"""
        try:
            from src.infrastructure.external.platform_detector import PlatformDetector
            from src.infrastructure.external.system_monitor import SystemMonitor
            
            lm_status = "unknown"
            available_models = []
            try:
                # Use /v1/models endpoint (LM Studio supports this)
                base_url = settings.LM_STUDIO_BASE_URL.rstrip('/').rstrip('/v1')
                test_url = f"{base_url}/v1/models"
                response = requests.get(test_url, timeout=2)
                if response.status_code == 200:
                    lm_status = "connected"
                    try:
                        models_data = response.json()
                        available_models = [model.get("id", model.get("name", "unknown")) for model in models_data.get("data", [])]
                    except Exception:
                        pass
                else:
                    lm_status = "unavailable"
            except Exception:
                lm_status = "disconnected"
            
            # Get system resources
            resources = SystemMonitor.get_resources()
            gpu_info = PlatformDetector.get_gpu_info()
            faiss_backend, _ = PlatformDetector.get_faiss_backend()
            
            # Check FAISS availability
            try:
                import faiss
                faiss_available = True
                faiss_version = "GPU" if faiss_backend == "faiss-gpu" else "CPU"
            except ImportError:
                faiss_available = False
                faiss_version = "Not installed"
            
            return {
                "status": "ok",
                "model": settings.LM_MODEL_NAME,
                "lm_studio": lm_status,
                "available_models": available_models,
                "model_loaded": settings.LM_MODEL_NAME in available_models if available_models else None,
                "max_files": settings.MAX_FILES,
                "max_repo_files": settings.GITHUB_MAX_REPO_FILES,
                "max_content_preview": settings.MAX_CONTENT_PREVIEW,
                "platform": {
                    "os": resources.platform,
                    "cpu_percent": round(resources.cpu_percent, 1),
                    "memory_percent": round(resources.memory_percent, 1),
                    "memory_used_gb": round(resources.memory_used_gb, 1),
                    "memory_total_gb": round(resources.memory_total_gb, 1),
                    "gpu_available": resources.gpu_available,
                    "gpu_info": gpu_info,
                },
                "faiss": {
                    "available": faiss_available,
                    "backend": faiss_version,
                    "recommended": faiss_backend,
                },
            }, 200
        except Exception as exc:
            logger.exception("Health check failed")
            return {"status": "error", "message": str(exc)}, 500
    
    @app.route("/api/upload", methods=["POST"])
    def upload():
        """Handle file upload (supports regular files and zip archives)"""
        try:
            files = request.files.getlist("file")
            if not files:
                logger.error("Upload failed: missing file part")
                return jsonify({"error": "No file part"}), 400
            
            # Check if any file is a zip
            zip_files = [f for f in files if f.filename and f.filename.lower().endswith('.zip')]
            regular_files = [f for f in files if f.filename and not f.filename.lower().endswith('.zip')]
            
            # Handle zip file upload
            if zip_files:
                if len(zip_files) > 1:
                    return jsonify({"error": "Only one zip file can be uploaded at a time"}), 400
                
                if regular_files:
                    return jsonify({"error": "Cannot mix zip files with regular files. Upload zip separately or regular files separately."}), 400
                
                zip_file = zip_files[0]
                # Save zip file temporarily
                safe_name = secure_filename(zip_file.filename)
                zip_path = settings.UPLOAD_PATH / safe_name
                zip_file.save(zip_path)
                
                try:
                    # Extract and process zip
                    zip_result = zip_service.extract_zip(zip_path)
                    
                    # Convert to repo format
                    repo_files = zip_service.convert_to_repo_format(zip_result)
                    
                    # Combine content for backward compatibility
                    combined_content = "\n\n".join([
                        f"FILE: {f['path']}\n{f['content']}"
                        for f in repo_files
                    ])
                    
                    logger.info(
                        f"Zip extraction successful | files={zip_result.total_files} | "
                        f"content_length={zip_result.total_chars} | skipped={len(zip_result.skipped_files)}"
                    )
                    
                    return jsonify({
                        "filename": safe_name,
                        "filenames": [f["path"] for f in repo_files],
                        "file_count": zip_result.total_files,
                        "content": combined_content,
                        "content_type": "code",  # Zip files are typically code projects
                        "skipped": zip_result.skipped_files[:50],  # Limit response size
                        "warnings": zip_result.warnings,
                        "is_zip": True,
                        "repo_files": repo_files,  # Include structured file data for RAG pipeline
                    })
                finally:
                    # Clean up zip file
                    try:
                        zip_path.unlink()
                    except Exception:
                        pass
            
            # Handle regular file uploads (existing logic)
            saved_uploads, skipped = file_service.save_uploaded_files(regular_files)
            
            # Combine content - read FULL files
            combined_content = file_service.combine_file_contents(saved_uploads)
            content_type = file_service.get_batch_content_type(saved_uploads)
            
            logger.info(
                f"Upload successful | files={len(saved_uploads)} | "
                f"content_length={len(combined_content)} | type={content_type}"
            )
            
            return jsonify({
                "filename": ", ".join(upload.filename for upload in saved_uploads),
                "filenames": [upload.filename for upload in saved_uploads],
                "file_count": len(saved_uploads),
                "content": combined_content,
                "content_type": content_type,
                "skipped": skipped,
                "is_zip": False,
            })
        except ValidationError as e:
            logger.warning(f"Validation error: {e}")
            return jsonify({"error": str(e)}), 400
        except FileProcessingError as e:
            logger.error(f"File processing error: {e}")
            return jsonify({"error": str(e)}), 500
        except Exception as e:
            logger.exception("Upload failed")
            include_trace = bool(os.environ.get("DEBUG_TRACE", "").lower() in {"1", "true", "yes"})
            return _error_response(str(e), status=500, include_trace=include_trace)
    
    @app.route("/api/generate", methods=["POST"])
    def generate():
        """Generate documentation from uploaded files or zip archives"""
        try:
            data = request.get_json(silent=True) or {}
            raw_content: str = (data.get("rawContent") or "").strip()
            content_type_str: str = (data.get("contentType") or "").strip()
            title: Optional[str] = (data.get("title") or "").strip() or None
            file_count = data.get("file_count")
            is_zip = data.get("is_zip", False)
            repo_files = data.get("repo_files", [])
            
            # Handle zip file uploads - use RAG pipeline like GitHub repos
            if is_zip and repo_files:
                # Import repo services here to avoid circular imports
                from src.application.services.github_service import GitHubService
                from src.application.services.rag_index_service import RAGIndexService
                from src.application.services.repo_doc_service import RepoDocService
                from src.application.services.repo_orchestrator_service import RepoOrchestratorService
                from src.application.services.repo_scan_service import RepoScanService
                
                github_service = GitHubService()
                repo_scan_service = RepoScanService(llm_client)
                rag_index_service = RAGIndexService(settings.LM_STUDIO_BASE_URL)
                repo_doc_service = RepoDocService(llm_client, pdf_generator, rag_index_service)
                
                # Get auth token
                token = None
                try:
                    auth_header = request.headers.get('Authorization', '')
                    if auth_header.startswith('Bearer '):
                        token = auth_header.split(' ', 1)[1]
                except Exception:
                    pass
                
                # Check usage limit
                if token:
                    can_proceed, usage_info, error_msg = user_service.check_usage_limit(token, "codeToDoc")
                    if not can_proceed:
                        logger.warning(f"Usage limit reached for codeToDoc: {error_msg}")
                        return jsonify({"error": error_msg}), 403
                
                # Create status callback
                def zip_status_callback(**kwargs):
                    status_reporter.report_progress(
                        status=kwargs.get('status', 'pending'),
                        progress=kwargs.get('progress', 0),
                        current_step=kwargs.get('current_step', ''),
                        token=token,
                        type='zip_upload',
                        file_count=kwargs.get('file_count', len(repo_files)),
                        total_steps=kwargs.get('total_steps', 0),
                        completed_steps=kwargs.get('completed_steps', 0)
                    )
                    if kwargs.get('status') == 'completed':
                        status_reporter.report_completion(
                            markdown=kwargs.get('markdown', ''),
                            pdf_url=kwargs.get('pdf_url'),
                            pdf_info=kwargs.get('pdf_info'),
                            token=token
                        )
                
                # Create orchestrator for zip files
                zip_orchestrator = RepoOrchestratorService(
                    llm_client=llm_client,
                    pdf_generator=pdf_generator,
                    github_service=github_service,
                    repo_scan_service=repo_scan_service,
                    rag_index_service=rag_index_service,
                    repo_doc_service=repo_doc_service,
                    status_callback=zip_status_callback
                )
                
                # Generate repo_id for zip
                import time
                zip_repo_id = f"zip_upload_{int(time.time())}"
                
                # Generate documentation using RAG pipeline
                result = zip_orchestrator.generate_documentation_from_files(
                    repo_id=zip_repo_id,
                    repo_files=repo_files,
                    repo_name=title or "Uploaded Project",
                    owner="user",
                    title=title
                )
                
                # Increment usage
                if token:
                    user_service.increment_usage(token, "codeToDoc", 1)
                
                return jsonify({
                    "success": True,
                    "output": result["markdown"],
                    "docText": result["markdown"],
                    "pdfFilename": Path(result["pdf_path"]).name if result["pdf_path"] else None,
                    "pdfPath": result["pdf_url"],
                    "pdfUrl": result["pdf_url"],
                    "chapters": result.get("chapters", []),
                    "content_type": "code",
                    "file_count": len(repo_files),
                }), 200
            
            # Validate input - only allow file uploads, no direct text
            if not raw_content:
                return jsonify({
                    "error": "No content provided. Please upload files or use GitHub repo mode."
                }), 400
            
            # Require file_count to ensure this came from file upload
            if not file_count or file_count < 1:
                return jsonify({
                    "error": "Direct text mode is not supported. Please upload files or use GitHub repo mode."
                }), 400
            
            # Validate content type
            if content_type_str not in {"code", "text"}:
                return jsonify({"error": "contentType must be 'code' or 'text'"}), 400
            
            content_type: ContentType = content_type_str  # type: ignore
            
            # Auto-detect content type if ambiguous
            if content_type == "text" and any(keyword in raw_content.lower() for keyword in ["function", "class", "def ", "import ", "export "]):
                logger.info("Auto-detected code content, switching content_type")
                content_type = "code"
            
            # Get auth token from request headers
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
            
            # Report initial status
            status_reporter.report_progress(
                status="pending",
                progress=0,
                current_step="Starting generation...",
                token=token,
                type="file_upload",
                file_count=file_count
            )
            
            # Create generation request
            generation = DocumentGeneration(
                raw_content=raw_content,
                content_type=content_type,
                title=title,
                file_count=file_count,
            )
            
            # Report generating status
            status_reporter.report_progress(
                status="generating",
                progress=30,
                current_step="Generating documentation from files...",
                token=token,
                type="file_upload",
                file_count=file_count
            )
            
            # Generate document
            logger.info(f"Starting document generation | content_length={len(raw_content)} | type={content_type} | files={file_count}")
            result = document_service.generate_document(generation)
            
            # Validate result
            if not result.markdown_content or len(result.markdown_content.strip()) < 50:
                logger.error(f"Generated documentation is too short: {len(result.markdown_content) if result.markdown_content else 0} chars")
                raise RuntimeError("Generated documentation is incomplete or empty. Please try again.")
            
            logger.info(f"Document generation successful | output_length={len(result.markdown_content)} | pdf={bool(result.pdf_path)}")
            
            # Report completion
            status_reporter.report_completion(
                markdown=result.markdown_content,
                pdf_url=result.pdf_url,
                pdf_info={"filename": result.pdf_path.name} if result.pdf_path else None,
                token=token
            )
            
            # Increment usage after successful generation
            if token:
                user_service.increment_usage(token, "codeToDoc", 1)
            
            return jsonify({
                "output": result.markdown_content,
                "docText": result.markdown_content,  # Backward compatibility
                "pdfFilename": result.pdf_path.name if result.pdf_path else None,
                "pdfPath": result.pdf_url,
                "pdfUrl": result.pdf_url,
                "content_type": result.content_type,
                "file_count": result.file_count,
                "success": True,
            })
        except ValidationError as e:
            logger.warning(f"Validation error: {e}")
            return jsonify({"error": str(e)}), 400
        except RuntimeError as e:
            logger.error(f"Runtime error during generation: {e}")
            return jsonify({"error": str(e)}), 500
        except Exception as e:
            logger.exception("Document generation failed")
            include_trace = bool(os.environ.get("DEBUG_TRACE", "").lower() in {"1", "true", "yes"})
            return _error_response(str(e), status=500, include_trace=include_trace)
    
    # Register API routes BEFORE static routes to ensure proper matching
    logger.info("Registering bot, user, and repo API routes...")
    register_bot_routes(app)
    register_user_routes(app)
    register_repo_routes(app)
    logger.info("API routes registered successfully")
    
    @app.route("/uploads/<path:filename>", methods=["GET"])
    def serve_upload(filename: str):
        """Serve uploaded files"""
        return send_from_directory(str(settings.UPLOAD_PATH), filename, as_attachment=False)
    
    @app.route("/")
    def index():
        """Serve frontend index"""
        return send_from_directory(app.static_folder, "index.html")
    
    @app.route("/<path:path>")
    def static_proxy(path: str):
        """Serve frontend static files"""
        # Don't match API routes
        if path.startswith("api/"):
            return jsonify({"error": "API route not found"}), 404
        
        target = Path(app.static_folder) / path
        if target.exists():
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, "index.html")
    
    return app

