"""Bot management and RAG API routes"""

import json
import logging
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from flask import jsonify, request, Response
from werkzeug.utils import secure_filename

from src.config.settings import settings
from src.infrastructure.external.rag import RAGEngine

logger = logging.getLogger(__name__)

# Storage for bots (in production, use a database)
BOTS_STORAGE = Path(settings.BASE_DIR) / "data" / "bots"
BOTS_STORAGE.mkdir(parents=True, exist_ok=True)

# RAG indices directory
RAG_INDICES_DIR = Path(settings.BASE_DIR) / "data" / "rag_indices"
RAG_INDICES_DIR.mkdir(parents=True, exist_ok=True)


def load_bots():
    """Load all bots from storage"""
    bots_file = BOTS_STORAGE / "bots.json"
    if bots_file.exists():
        try:
            with open(bots_file, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load bots: {e}")
            return []
    return []


def save_bots(bots):
    """Save bots to storage"""
    bots_file = BOTS_STORAGE / "bots.json"
    try:
        with open(bots_file, "w") as f:
            json.dump(bots, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save bots: {e}")
        raise


def get_bot(bot_id: str) -> Optional[dict]:
    """Get a bot by ID"""
    bots = load_bots()
    return next((bot for bot in bots if bot.get("id") == bot_id), None)


def register_bot_routes(app):
    """Register bot-related routes"""
    
    @app.route("/api/bots", methods=["GET"])
    def list_bots():
        """List all bots"""
        try:
            bots = load_bots()
            return jsonify({"bots": bots}), 200
        except Exception as e:
            logger.exception("Failed to list bots")
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/bots", methods=["POST"])
    def create_bot():
        """Create a new bot"""
        try:
            data = request.get_json() or {}
            
            bot_id = str(uuid.uuid4())
            bot = {
                "id": bot_id,
                "name": data.get("name", "Unnamed Bot"),
                "description": data.get("description", ""),
                "systemPrompt": data.get("systemPrompt", ""),
                "temperature": data.get("temperature", 0.7),
                "topK": data.get("topK", 5),
                "documentCount": 0,
                "createdAt": datetime.now().isoformat(),
            }
            
            bots = load_bots()
            bots.append(bot)
            save_bots(bots)
            
            return jsonify({"bot": bot}), 201
        except Exception as e:
            logger.exception("Failed to create bot")
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/bots/<bot_id>", methods=["GET"])
    def get_bot_route(bot_id: str):
        """Get a specific bot"""
        try:
            bot = get_bot(bot_id)
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
            bots = load_bots()
            
            bot_index = next((i for i, b in enumerate(bots) if b.get("id") == bot_id), None)
            if bot_index is None:
                return jsonify({"error": "Bot not found"}), 404
            
            # Update bot fields
            bots[bot_index].update({
                "name": data.get("name", bots[bot_index].get("name")),
                "description": data.get("description", bots[bot_index].get("description")),
                "systemPrompt": data.get("systemPrompt", bots[bot_index].get("systemPrompt")),
                "temperature": data.get("temperature", bots[bot_index].get("temperature", 0.7)),
                "topK": data.get("topK", bots[bot_index].get("topK", 5)),
            })
            
            save_bots(bots)
            return jsonify({"bot": bots[bot_index]}), 200
        except Exception as e:
            logger.exception("Failed to update bot")
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/bots/<bot_id>", methods=["DELETE"])
    def delete_bot(bot_id: str):
        """Delete a bot"""
        try:
            bots = load_bots()
            bots = [b for b in bots if b.get("id") != bot_id]
            save_bots(bots)
            
            # Delete RAG index if exists
            index_path = RAG_INDICES_DIR / f"{bot_id}.index"
            if index_path.exists():
                index_path.unlink()
            metadata_path = RAG_INDICES_DIR / f"{bot_id}.metadata.json"
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
            bot = get_bot(bot_id)
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
            bots = load_bots()
            bot_index = next((i for i, b in enumerate(bots) if b.get("id") == bot_id), None)
            if bot_index is not None:
                bots[bot_index]["documentCount"] = len([d for d in documents if d.get("status") == "vectorized"])
                save_bots(bots)
            
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
            bot = get_bot(bot_id)
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

