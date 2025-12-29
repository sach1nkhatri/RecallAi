"""Flask API routes"""

import logging
import os
import traceback
from pathlib import Path
from typing import Optional

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import requests

from src.config.settings import settings
from src.domain.models import DocumentGeneration, ContentType
from src.domain.exceptions import ValidationError, FileProcessingError
from src.application.services.file_service import FileService
from src.application.services.document_service import DocumentService
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
    status_reporter = StatusReporter(settings.NODE_BACKEND_URL)
    user_service = UserService(settings.NODE_BACKEND_URL)
    
    # Create Flask app
    app = Flask(__name__, static_folder=str(settings.FRONTEND_DIR), static_url_path="")
    CORS(app)
    
    @app.route("/api/health", methods=["GET"])
    def health() -> tuple[dict, int]:
        """Health check endpoint with system information"""
        try:
            lm_status = "unknown"
            try:
                # Use /v1/models endpoint (LM Studio supports this)
                test_url = f"{settings.LM_STUDIO_BASE_URL}/models"
                response = requests.get(test_url, timeout=2)
                lm_status = "connected" if response.status_code == 200 else "unavailable"
            except Exception:
                lm_status = "disconnected"
            
            return {
                "status": "ok",
                "model": settings.LM_MODEL_NAME,
                "lm_studio": lm_status,
                "max_files": settings.MAX_FILES,
                "max_content_preview": settings.MAX_CONTENT_PREVIEW,
            }, 200
        except Exception as exc:
            logger.exception("Health check failed")
            return {"status": "error", "message": str(exc)}, 500
    
    @app.route("/api/upload", methods=["POST"])
    def upload():
        """Handle file upload"""
        try:
            files = request.files.getlist("file")
            if not files:
                logger.error("Upload failed: missing file part")
                return jsonify({"error": "No file part"}), 400
            
            # Save files using service
            saved_uploads, skipped = file_service.save_uploaded_files(files)
            
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
        """Generate documentation from uploaded files only (no direct text mode)"""
        try:
            data = request.get_json(silent=True) or {}
            raw_content: str = (data.get("rawContent") or "").strip()
            content_type_str: str = (data.get("contentType") or "").strip()
            title: Optional[str] = (data.get("title") or "").strip() or None
            file_count = data.get("file_count")
            
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

