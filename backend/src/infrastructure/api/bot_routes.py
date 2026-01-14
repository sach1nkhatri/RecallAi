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
from src.infrastructure.storage.chat_message_model import ChatMessageModel

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
                    logger.info(f"Found existing index for bot {bot_id}: {existing_index}")
            
            # Set bot to training status
            bot_service.set_bot_status(bot_id, "training", 10)
            
            documents = []
            total_files = len(saved_files)
            current_index_path = existing_index  # Track the current index path across files
            
            for idx, file_info in enumerate(saved_files):
                try:
                    # Update progress
                    progress = int(10 + (idx / total_files) * 80)  # 10-90%
                    bot_service.set_bot_status(bot_id, "training", progress)
                    
                    logger.info(f"Vectorizing file {idx + 1}/{total_files}: {file_info['filename']} (using index: {current_index_path})")
                    
                    index_path_str, metadata = rag_engine.vectorize_file(
                        file_path=file_info["path"],
                        bot_id=bot_id,
                        existing_index_path=current_index_path,
                    )
                    
                    # Update current_index_path so next file uses the same (updated) index
                    current_index_path = index_path_str
                    logger.info(f"File {file_info['filename']} vectorized successfully. Index now at: {current_index_path} with {len(metadata)} total chunks")
                    
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
            
            # Update bot document count and status
            vectorized_count = len([d for d in documents if d.get("status") == "vectorized"])
            error_count = len([d for d in documents if d.get("status") == "error"])
            
            # Set bot status based on results
            if error_count > 0 and vectorized_count == 0:
                # All failed
                bot_service.set_bot_status(bot_id, "error", 0)
            elif vectorized_count > 0:
                # At least some succeeded
                bot_service.set_bot_status(bot_id, "active", 100)
                bot_service.update_document_count(bot_id, vectorized_count)
            else:
                # Still training/processing
                bot_service.set_bot_status(bot_id, "training", 50)
            
            return jsonify({
                "success": True,
                "documents": documents,
                "message": f"Uploaded and vectorized {vectorized_count} document(s)",
                "vectorizedCount": vectorized_count,
                "errorCount": error_count,
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
                    logger.info(f"Found index for bot {bot_id}: {index_path}")
            
            vectorized_files = set()
            
            if index_path.exists():
                try:
                    from src.infrastructure.external.rag.vectorstore import load_metadata
                    metadata = load_metadata(str(index_path))
                    logger.info(f"Loaded {len(metadata)} metadata entries for bot {bot_id}")
                    # Extract unique filenames from metadata
                    for meta in metadata:
                        if "filename" in meta:
                            vectorized_files.add(meta["filename"])
                    logger.info(f"Found {len(vectorized_files)} unique vectorized files: {vectorized_files}")
                except Exception as e:
                    logger.error(f"Failed to load metadata for bot {bot_id} from {index_path}: {e}", exc_info=True)
            
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
            # Get user_id from X-User-ID header (set by Node backend)
            user_id = request.headers.get('X-User-ID', 'default')
            
            bot = bot_service.get_bot(bot_id)
            if not bot:
                return jsonify({"error": "Bot not found"}), 404
            
            data = request.get_json() or {}
            message = data.get("message", "").strip()
            if not message:
                return jsonify({"error": "Message is required"}), 400
            
            # Save user message to database
            try:
                ChatMessageModel.create(
                    user_id=user_id,
                    bot_id=bot_id,
                    role="user",
                    content=message
                )
            except Exception as e:
                logger.warning(f"Failed to save user message to database: {e}")
            
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
                
                # Log retrieval info for debugging
                logger.info(f"Retrieved {len(selected_chunks)} chunks for query: {message[:50]}...")
                if selected_chunks:
                    avg_similarity = sum(c.get('similarity', 0) for c in selected_chunks) / len(selected_chunks)
                    logger.info(f"Average similarity: {avg_similarity:.3f}")
                    logger.debug(f"Top chunk similarity: {selected_chunks[0].get('similarity', 0):.3f}")
                
                # Helper function to clean redacted_reasoning and think tags
                def clean_redacted_reasoning(text):
                    """Remove <think>, <think> tags and their content, plus thinking patterns"""
                    if not text:
                        return text
                    import re
                    # Remove <think>...</think> tags and their content
                    cleaned = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL | re.IGNORECASE)
                    # Remove <think>...</think> tags and their content
                    cleaned = re.sub(r'<think>.*?</think>', '', cleaned, flags=re.DOTALL | re.IGNORECASE)
                    # Remove any remaining thinking patterns (lines starting with thinking phrases)
                    thinking_patterns = [
                        r'^okay,?\s+i\s+need\s+to.*?\n',
                        r'^let\s+me\s+.*?\n',
                        r'^first,?\s+.*?\n',
                        r'^looking\s+at\s+.*?\n',
                        r'^wait,?\s+.*?\n',
                        r'^i\s+see\s+that.*?\n',
                        r'^the\s+user\s+.*?\n',
                        r'^based\s+on\s+the\s+.*?\n',
                        r'^i\s+should\s+.*?\n',
                        r'^i\s+will\s+.*?\n',
                        r'^i\s+think\s+.*?\n',
                        r'^i\s+believe\s+.*?\n',
                        r'^i\s+understand\s+.*?\n',
                    ]
                    for pattern in thinking_patterns:
                        cleaned = re.sub(pattern, '', cleaned, flags=re.MULTILINE | re.IGNORECASE)
                    # Remove content before first actual content (heading, code block, etc.)
                    lines = cleaned.split('\n')
                    cleaned_lines = []
                    found_content = False
                    for line in lines:
                        stripped = line.strip()
                        if not stripped:
                            if found_content:
                                cleaned_lines.append(line)
                            continue
                        # Check if this is actual content (not thinking)
                        is_content = (
                            stripped.startswith('#') or
                            stripped.startswith('```') or
                            stripped.startswith('|') or
                            (stripped[0].isupper() and len(stripped) > 10) or
                            (stripped[0].isdigit() and '.' in stripped[:5]) or
                            found_content
                        )
                        if is_content:
                            found_content = True
                            cleaned_lines.append(line)
                        elif not any(phrase in stripped.lower()[:30] for phrase in ['okay', 'let me', 'first', 'looking', 'wait', 'i see', 'i think', 'i believe']):
                            # Not thinking, include it
                            found_content = True
                            cleaned_lines.append(line)
                    cleaned = '\n'.join(cleaned_lines)
                    return cleaned.strip()
                
                # Helper function to add spaces between words when missing
                def normalize_spaces(text):
                    """Add spaces between words when missing - smart normalization"""
                    if not text:
                        return text
                    import re
                    
                    # First, check if text already has proper spacing (most words have spaces)
                    # If more than 70% of word boundaries already have spaces, don't normalize aggressively
                    words_with_spaces = len(re.findall(r'\b\w+\s+', text))
                    total_words = len(re.findall(r'\b\w+\b', text))
                    if total_words > 0 and words_with_spaces / total_words > 0.7:
                        # Text already has good spacing, only fix obvious issues
                        # Pattern 1: lowercase letter followed by uppercase letter (camelCase)
                        text = re.sub(r'([a-z])([A-Z][a-z])', r'\1 \2', text)
                        # Pattern 2: punctuation without space after
                        text = re.sub(r'([!?.,;:])([A-Za-z])', r'\1 \2', text)
                        # Clean up multiple spaces
                        text = re.sub(r' +', ' ', text)
                        return text.strip()
                    
                    # Text has missing spaces - apply normalization
                    # Pattern 1: lowercase letter followed by uppercase letter (word boundary)
                    # e.g., "helloWorld" -> "hello World"
                    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
                    
                    # Pattern 2: letter followed by punctuation then letter (if no space)
                    # e.g., "hello!Yes" -> "hello! Yes" (but not "hello!" -> "hello! ")
                    text = re.sub(r'([a-zA-Z])([!?.])([A-Za-z])', r'\1\2 \3', text)
                    
                    # Pattern 3: punctuation followed by letter (if no space)
                    # e.g., "Yes,I'm" -> "Yes, I'm"
                    text = re.sub(r'([!?.,;:])([A-Za-z])', r'\1 \2', text)
                    
                    # Pattern 4: apostrophe in contractions - ONLY if followed by 2+ letters
                    # e.g., "I'mready" -> "I'm ready" (but NOT "I'm" -> "I' m")
                    text = re.sub(r"(\w)'([a-zA-Z]{2,})", r"\1' \2", text)
                    
                    # Pattern 5: number followed by letter or vice versa
                    # e.g., "2024sales" -> "2024 sales"
                    text = re.sub(r'([0-9])([A-Za-z])', r'\1 \2', text)
                    text = re.sub(r'([A-Za-z])([0-9])', r'\1 \2', text)
                    
                    # Pattern 6: Common word boundaries - ONLY at word boundaries
                    # Use word boundary assertions to avoid matching inside words
                    common_words = ['are', 'is', 'am', 'was', 'were', 'have', 'has', 'had', 'will', 'would', 'can', 'could', 'should', 'the', 'a', 'an', 'and', 'or', 'but', 'to', 'for', 'of', 'in', 'on', 'at', 'by', 'with', 'from', 'as']
                    for word in common_words:
                        # Word followed by letter - use word boundary to avoid matching inside words
                        pattern = f'\\b({word})([A-Za-z])'
                        text = re.sub(pattern, rf'\1 \2', text, flags=re.IGNORECASE)
                    
                    # Special case for "I" - only if followed by capital letter (not apostrophe)
                    text = re.sub(r'\bI([A-Z][a-z])', r'I \1', text)
                    
                    # Pattern 7: Fix camelCase
                    text = re.sub(r'([a-z])([A-Z][a-z])', r'\1 \2', text)
                    
                    # Clean up multiple spaces
                    text = re.sub(r' +', ' ', text)
                    
                    return text.strip()
                
                # Stream response and accumulate full message for saving
                full_assistant_message = ""
                
                # Stream response
                def generate():
                    nonlocal full_assistant_message
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
                                                    # Clean redacted_reasoning tags before sending
                                                    cleaned_content = clean_redacted_reasoning(content)
                                                    # Normalize spaces to fix missing spaces from tokenizer
                                                    normalized_content = normalize_spaces(cleaned_content)
                                                    if normalized_content:  # Only send if there's content after cleaning
                                                        full_assistant_message += normalized_content
                                                        yield f"data: {json.dumps({'content': normalized_content})}\n\n"
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
                                                # Clean redacted_reasoning tags before sending
                                                cleaned_content = clean_redacted_reasoning(content)
                                                # Normalize spaces to fix missing spaces from tokenizer
                                                normalized_content = normalize_spaces(cleaned_content)
                                                if normalized_content:  # Only send if there's content after cleaning
                                                    full_assistant_message += normalized_content
                                                    yield f"data: {json.dumps({'content': normalized_content})}\n\n"
                                        except json.JSONDecodeError:
                                            # If parsing fails, wrap as content (but clean it first)
                                            cleaned_chunk = clean_redacted_reasoning(str(chunk))
                                            normalized_chunk = normalize_spaces(cleaned_chunk)
                                            if normalized_chunk:
                                                yield f"data: {json.dumps({'content': normalized_chunk})}\n\n"
                                except Exception as parse_error:
                                    logger.warning(f"Error parsing chunk: {parse_error}, chunk: {chunk[:100]}")
                                    # Fallback: wrap as content (but clean it first)
                                    cleaned_chunk = clean_redacted_reasoning(str(chunk))
                                    normalized_chunk = normalize_spaces(cleaned_chunk)
                                    if normalized_chunk:
                                        full_assistant_message += normalized_chunk
                                        yield f"data: {json.dumps({'content': normalized_chunk})}\n\n"
                        
                        # Save assistant response to database after streaming completes
                        if full_assistant_message.strip():
                            try:
                                # Clean and normalize before saving to database
                                final_message = normalize_spaces(clean_redacted_reasoning(full_assistant_message.strip()))
                                if final_message:  # Only save if there's content after cleaning
                                    ChatMessageModel.create(
                                        user_id=user_id,
                                        bot_id=bot_id,
                                        role="assistant",
                                        content=final_message
                                    )
                            except Exception as e:
                                logger.warning(f"Failed to save assistant message to database: {e}")
                        
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
            except ValueError as e:
                # Handle "no relevant information" errors gracefully
                error_msg = str(e)
                logger.warning(f"RAG query failed: {error_msg}")
                return jsonify({
                    "error": error_msg,
                    "suggestion": "Try rephrasing your question or uploading more relevant documents."
                }), 500
            except FileNotFoundError as e:
                logger.error(f"Index not found: {e}")
                return jsonify({
                    "error": "No documents have been uploaded for this bot yet.",
                    "suggestion": "Please upload and vectorize documents first."
                }), 404
            except RuntimeError as e:
                # Handle embedding or LM Studio connection errors
                error_msg = str(e)
                logger.error(f"RAG engine error: {error_msg}")
                if "embed" in error_msg.lower() or "lm studio" in error_msg.lower():
                    return jsonify({
                        "error": "Failed to process query. Please check that LM Studio is running and the embedding model is loaded.",
                        "details": error_msg
                    }), 503
                return jsonify({"error": error_msg}), 500
            except Exception as e:
                logger.exception("RAG query failed")
                return jsonify({
                    "error": "An unexpected error occurred while processing your query.",
                    "details": str(e)
                }), 500
        except Exception as e:
            logger.exception("Chat failed")
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/bots/<bot_id>/chat/history", methods=["GET"])
    def get_chat_history(bot_id: str):
        """Get chat history for a bot"""
        try:
            # Get user_id from X-User-ID header (set by Node backend)
            user_id = request.headers.get('X-User-ID', 'default')
            
            # Get limit from query params (default 50)
            limit = request.args.get('limit', 50, type=int)
            
            # Get chat history
            messages = ChatMessageModel.find_recent_by_bot(
                user_id=user_id,
                bot_id=bot_id,
                limit=limit
            )
            
            # Format messages for frontend
            formatted_messages = [
                {
                    "role": msg["role"],
                    "content": msg["content"],
                    "createdAt": msg.get("createdAt", "")
                }
                for msg in messages
            ]
            
            return jsonify({
                "messages": formatted_messages,
                "count": len(formatted_messages)
            }), 200
        except Exception as e:
            logger.exception("Failed to get chat history")
            return jsonify({"error": str(e)}), 500

