"""Bot management and RAG API routes"""

import json
import logging
import os
from pathlib import Path
from typing import Optional

from flask import jsonify, request, Response
from werkzeug.utils import secure_filename

from src.config.settings import settings
from src.infrastructure.external.rag import RAGEngine
from src.application.services.bot_service import BotService

logger = logging.getLogger(__name__)

# Initialize bot service
bot_service = BotService()

# RAG indices directory
RAG_INDICES_DIR = Path(settings.BASE_DIR) / "data" / "rag_indices"
RAG_INDICES_DIR.mkdir(parents=True, exist_ok=True)


def register_bot_routes(app):
    """Register bot-related routes"""
    
    @app.route("/api/bots", methods=["GET"])
    def list_bots():
        """List all bots"""
        try:
            # Get user_id from X-User-ID header (set by Node backend)
            user_id = request.headers.get('X-User-ID')
            if not user_id:
                # Fallback: try to extract from Authorization header
                auth_header = request.headers.get('Authorization', '')
                if auth_header.startswith('Bearer '):
                    # TODO: Extract user_id from JWT token if needed
                    pass
            
            bots = bot_service.list_bots(user_id=user_id)
            return jsonify({"bots": bots}), 200
        except Exception as e:
            logger.exception("Failed to list bots")
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/bots", methods=["POST"])
    def create_bot():
        """Create a new bot"""
        try:
            data = request.get_json() or {}
            
            # Extract user_id from auth token if available
            user_id = None
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                # TODO: Extract user_id from JWT token if needed
                pass
            
            bot = bot_service.create_bot(data, user_id=user_id)
            
            return jsonify({"bot": bot}), 201
        except Exception as e:
            logger.exception("Failed to create bot")
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/bots/<bot_id>", methods=["GET"])
    def get_bot_route(bot_id: str):
        """Get a specific bot"""
        try:
            bot = bot_service.get_bot(bot_id)
            if not bot:
                return jsonify({"error": "Bot not found"}), 404
            return jsonify({"bot": bot}), 200
        except Exception as e:
            logger.exception("Failed to get bot")
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/bots/<bot_id>", methods=["PUT"])
    def update_bot(bot_id: str):
        """Update a bot"""
        try:
            data = request.get_json() or {}
            bot = bot_service.update_bot(bot_id, data)
            
            if not bot:
                return jsonify({"error": "Bot not found"}), 404
            
            return jsonify({"bot": bot}), 200
        except Exception as e:
            logger.exception("Failed to update bot")
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/bots/<bot_id>", methods=["DELETE"])
    def delete_bot(bot_id: str):
        """Delete a bot"""
        try:
            deleted = bot_service.delete_bot(bot_id)
            
            if not deleted:
                return jsonify({"error": "Bot not found"}), 404
            
            # Delete RAG index if exists
            index_path = RAG_INDICES_DIR / f"{bot_id}.index"
            if index_path.exists():
                index_path.unlink()
            metadata_path = RAG_INDICES_DIR / f"{bot_id}.index.meta.json"
            if metadata_path.exists():
                metadata_path.unlink()
            
            return jsonify({"success": True}), 200
        except Exception as e:
            logger.exception("Failed to delete bot")
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/bots/<bot_id>/documents", methods=["POST"])
    def upload_documents(bot_id: str):
        """Upload documents for a bot and vectorize them"""
        try:
            bot = bot_service.get_bot(bot_id)
            if not bot:
                return jsonify({"error": "Bot not found"}), 404
            
            files = request.files.getlist("files")
            if not files:
                return jsonify({"error": "No files provided"}), 400
            
            # Save uploaded files
            bot_upload_dir = settings.UPLOAD_PATH / "bots" / bot_id
            bot_upload_dir.mkdir(parents=True, exist_ok=True)
            
            saved_files = []
            for file in files:
                if file.filename:
                    filename = secure_filename(file.filename)
                    file_path = bot_upload_dir / filename
                    file.save(str(file_path))
                    saved_files.append({
                        "filename": filename,
                        "path": str(file_path),
                    })
            
            # Initialize RAG engine
            rag_engine = RAGEngine(
                base_url=settings.LM_STUDIO_BASE_URL,
                index_dir=str(RAG_INDICES_DIR)
            )
            
            # Vectorize documents
            index_path = RAG_INDICES_DIR / f"{bot_id}.index"
            existing_index = str(index_path) if index_path.exists() else None
            
            documents = []
            for file_info in saved_files:
                try:
                    index_path_str, metadata = rag_engine.vectorize_file(
                        file_path=file_info["path"],
                        bot_id=bot_id,
                        existing_index_path=existing_index,
                    )
                    existing_index = index_path_str
                    documents.append({
                        "filename": file_info["filename"],
                        "status": "vectorized",
                    })
                except Exception as e:
                    logger.error(f"Failed to vectorize {file_info['filename']}: {e}")
                    documents.append({
                        "filename": file_info["filename"],
                        "status": "error",
                        "error": str(e),
                    })
            
            # Update bot document count
            vectorized_count = len([d for d in documents if d.get("status") == "vectorized"])
            bot_service.update_document_count(bot_id, vectorized_count)
            
            return jsonify({
                "success": True,
                "documents": documents,
                "message": f"Uploaded and vectorized {len(documents)} document(s)",
            }), 200
        except Exception as e:
            logger.exception("Failed to upload documents")
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/bots/<bot_id>/documents", methods=["GET"])
    def list_documents(bot_id: str):
        """List documents for a bot"""
        try:
            bot_upload_dir = settings.UPLOAD_PATH / "bots" / bot_id
            if not bot_upload_dir.exists():
                return jsonify({"documents": []}), 200
            
            documents = []
            for file_path in bot_upload_dir.iterdir():
                if file_path.is_file():
                    index_path = RAG_INDICES_DIR / f"{bot_id}.index"
                    status = "vectorized" if index_path.exists() else "pending"
                    documents.append({
                        "filename": file_path.name,
                        "status": status,
                    })
            
            return jsonify({"documents": documents}), 200
        except Exception as e:
            logger.exception("Failed to list documents")
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/bots/<bot_id>/chat", methods=["POST"])
    def chat_with_bot(bot_id: str):
        """Chat with a bot using RAG"""
        try:
            bot = bot_service.get_bot(bot_id)
            if not bot:
                return jsonify({"error": "Bot not found"}), 404
            
            data = request.get_json() or {}
            message = data.get("message", "").strip()
            if not message:
                return jsonify({"error": "Message is required"}), 400
            
            # Check if RAG index exists
            index_path = RAG_INDICES_DIR / f"{bot_id}.index"
            if not index_path.exists():
                return jsonify({
                    "error": "No documents uploaded for this bot. Please upload documents first."
                }), 400
            
            # Initialize RAG engine
            rag_engine = RAGEngine(
                base_url=settings.LM_STUDIO_BASE_URL,
                index_dir=str(RAG_INDICES_DIR)
            )
            
            # Query RAG
            system_prompt = bot.get("systemPrompt", "")
            temperature = bot.get("temperature", 0.7)
            top_k = bot.get("topK", 5)
            
            try:
                prompt, selected_chunks, stream_generator = rag_engine.query(
                    index_path=str(index_path),
                    question=message,
                    system_prompt=system_prompt,
                    temperature=temperature,
                    top_k=top_k,
                )
                
                # Stream response
                def generate():
                    try:
                        for chunk in stream_generator:
                            if chunk:
                                yield f"data: {json.dumps({'content': chunk})}\n\n"
                        yield "data: [DONE]\n\n"
                    except Exception as e:
                        logger.error(f"Streaming error: {e}")
                        yield f"data: {json.dumps({'error': str(e)})}\n\n"
                
                return Response(
                    generate(),
                    mimetype="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                    }
                )
            except Exception as e:
                logger.exception("RAG query failed")
                return jsonify({"error": str(e)}), 500
        except Exception as e:
            logger.exception("Chat failed")
            return jsonify({"error": str(e)}), 500

