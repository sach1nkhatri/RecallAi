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
from src.infrastructure.api.bot_routes import register_bot_routes

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
    
    # Initialize services
    llm_client = LMStudioClient()
    pdf_generator = FPDFGenerator()
    document_service = DocumentService(llm_client, pdf_generator)
    file_service = FileService()
    
    # Create Flask app
    app = Flask(__name__, static_folder=str(settings.FRONTEND_DIR), static_url_path="")
    CORS(app)
    
    @app.route("/api/health", methods=["GET"])
    def health() -> tuple[dict, int]:
        """Health check endpoint with system information"""
        try:
            lm_status = "unknown"
            try:
                test_url = f"{settings.LM_STUDIO_BASE_URL.replace('/v1', '')}/models"
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
            
            # Combine content
            combined_content = file_service.combine_file_contents(saved_uploads)
            content_type = file_service.get_batch_content_type(saved_uploads)
            
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
        """Generate documentation"""
        try:
            data = request.get_json(silent=True) or {}
            raw_content: str = (data.get("rawContent") or "").strip()
            content_type_str: str = (data.get("contentType") or "").strip()
            title: Optional[str] = (data.get("title") or "").strip() or None
            file_count = data.get("file_count")
            
            # Validate content type
            if content_type_str not in {"code", "text"}:
                return jsonify({"error": "contentType must be 'code' or 'text'"}), 400
            
            content_type: ContentType = content_type_str  # type: ignore
            
            # Create generation request
            generation = DocumentGeneration(
                raw_content=raw_content,
                content_type=content_type,
                title=title,
                file_count=file_count,
            )
            
            # Generate document
            result = document_service.generate_document(generation)
            
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
        except Exception as e:
            logger.exception("Document generation failed")
            include_trace = bool(os.environ.get("DEBUG_TRACE", "").lower() in {"1", "true", "yes"})
            return _error_response(str(e), status=500, include_trace=include_trace)
    
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
        target = Path(app.static_folder) / path
        if target.exists():
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, "index.html")
    
    # Register bot routes
    register_bot_routes(app)
    
    return app

