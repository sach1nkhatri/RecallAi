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
            
            # Get user_id from X-User-ID header (set by Node backend)
            user_id = request.headers.get('X-User-ID')
            
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
            
            # Vectorize documents - find existing index for this bot
            # Look for index files matching bot_id pattern (could be bot_id.index or bot_id_timestamp.index)
            existing_index = None
            index_path = RAG_INDICES_DIR / f"{bot_id}.index"
            if index_path.exists():
                existing_index = str(index_path)
            else:
                # Find the most recent index file for this bot
                pattern = f"{bot_id}_*.index"
                matching_files = list(RAG_INDICES_DIR.glob(pattern))
                if matching_files:
                    # Sort by modification time, get most recent
                    existing_index = str(max(matching_files, key=lambda p: p.stat().st_mtime))
            
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
                    # Delete the failed file from disk
                    try:
                        file_path = Path(file_info["path"])
                        if file_path.exists():
                            file_path.unlink()
                            logger.info(f"Deleted failed file: {file_info['filename']}")
                    except Exception as delete_error:
                        logger.warning(f"Failed to delete file {file_info['filename']}: {delete_error}")
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
        """List documents for a bot - only returns successfully vectorized documents"""
        try:
            bot_upload_dir = settings.UPLOAD_PATH / "bots" / bot_id
            if not bot_upload_dir.exists():
                return jsonify({"documents": []}), 200
            
            # Check if index exists and load metadata to see which files are vectorized
            # Find the index file for this bot (could be bot_id.index or bot_id_timestamp.index)
            index_path = RAG_INDICES_DIR / f"{bot_id}.index"
            if not index_path.exists():
                # Find the most recent index file for this bot
                pattern = f"{bot_id}_*.index"
                matching_files = list(RAG_INDICES_DIR.glob(pattern))
                if matching_files:
                    index_path = max(matching_files, key=lambda p: p.stat().st_mtime)
            
            vectorized_files = set()
            
            if index_path.exists():
                try:
                    from src.infrastructure.external.rag.vectorstore import load_metadata
                    metadata = load_metadata(str(index_path))
                    # Extract unique filenames from metadata
                    for meta in metadata:
                        if "filename" in meta:
                            vectorized_files.add(meta["filename"])
                except Exception as e:
                    logger.warning(f"Failed to load metadata for bot {bot_id}: {e}")
            
            # Only return files that exist in the upload directory AND are vectorized
            documents = []
            for file_path in bot_upload_dir.iterdir():
                if file_path.is_file():
                    filename = file_path.name
                    # Only include files that are in the vectorized set
                    if filename in vectorized_files:
                        documents.append({
                            "filename": filename,
                            "status": "vectorized",
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
            
            # Check if RAG index exists - find the index file for this bot
            index_path = RAG_INDICES_DIR / f"{bot_id}.index"
            if not index_path.exists():
                # Find the most recent index file for this bot
                pattern = f"{bot_id}_*.index"
                matching_files = list(RAG_INDICES_DIR.glob(pattern))
                if matching_files:
                    index_path = max(matching_files, key=lambda p: p.stat().st_mtime)
            
            if not index_path.exists():
                logger.warning(f"RAG index not found for bot {bot_id}. Index path: {index_path}")
                return jsonify({
                    "error": "No documents uploaded for this bot. Please upload and vectorize documents first."
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
                                # Decode bytes to string if needed
                                if isinstance(chunk, bytes):
                                    chunk = chunk.decode('utf-8')
                                
                                # Parse LM Studio SSE format: data: {"choices": [{"delta": {"content": "..."}}]}
                                try:
                                    if chunk.strip().startswith("data: "):
                                        json_str = chunk.strip()[6:]  # Remove "data: "
                                        if json_str and json_str != "[DONE]":
                                            try:
                                                data = json.loads(json_str)
                                                # Extract content from LM Studio response format
                                                content = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                                                if content:
                                                    yield f"data: {json.dumps({'content': content})}\n\n"
                                            except json.JSONDecodeError:
                                                # If not valid JSON, pass through as-is
                                                yield chunk if chunk.endswith('\n') else chunk + '\n'
                                        elif json_str == "[DONE]":
                                            yield "data: [DONE]\n\n"
                                    else:
                                        # Not in SSE format, try to parse as JSON
                                        try:
                                            data = json.loads(chunk)
                                            content = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                                            if content:
                                                yield f"data: {json.dumps({'content': content})}\n\n"
                                        except json.JSONDecodeError:
                                            # If parsing fails, wrap as content
                                            yield f"data: {json.dumps({'content': str(chunk)})}\n\n"
                                except Exception as parse_error:
                                    logger.warning(f"Error parsing chunk: {parse_error}, chunk: {chunk[:100]}")
                                    # Fallback: wrap as content
                                    yield f"data: {json.dumps({'content': str(chunk)})}\n\n"
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

