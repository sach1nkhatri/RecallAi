"""RAG Engine for document vectorization and querying"""

import json
import logging
import os
import time
from typing import Callable, Dict, List, Optional, Tuple

import requests
import numpy as np

from src.config.settings import settings

logger = logging.getLogger(__name__)
from .chunker import chunk_text
from .embedder import LMStudioEmbedder
from .extractor import extract_text
from .vectorstore import (
    build_faiss_index,
    load_index,
    load_metadata,
    save_index,
    save_metadata,
    search,
)


ProgressFn = Callable[[str, Optional[dict]], None]


class RAGEngine:
    """RAG Engine for document processing and querying"""
    
    def __init__(self, base_url: str, index_dir: str):
        """
        Initialize RAG Engine.
        
        Args:
            base_url: LM Studio base URL
            index_dir: Directory to store FAISS indices
        """
        self.embedder = LMStudioEmbedder(base_url)
        self.base_url = base_url.rstrip("/")
        self.index_dir = index_dir

    def vectorize_file(
        self,
        file_path: str,
        bot_id: str,
        emit: Optional[ProgressFn] = None,
        chunk_size: int = 500,  # Optimized for better semantic coherence
        overlap: int = 100,  # Increased for better context preservation
        existing_index_path: Optional[str] = None,
    ) -> Tuple[str, List[dict]]:
        """
        Vectorize a file and create/update FAISS index.
        
        Args:
            file_path: Path to file to vectorize
            bot_id: Bot identifier for index naming
            emit: Optional progress callback
            chunk_size: Chunk size in words
            overlap: Overlap between chunks in words
            existing_index_path: Path to existing index to update
            
        Returns:
            Tuple of (index_path, metadata_list)
        """
        def _emit(status: str, data: Optional[dict] = None):
            if emit:
                emit(status, data or {})

        _emit("vectorizing_started")
        raw_text = extract_text(file_path)
        # Extract filename for metadata
        filename = os.path.basename(file_path)

        _emit("chunking")
        # Use better chunking parameters for RAG (smaller chunks, more overlap)
        # Smaller chunks = better semantic coherence, more overlap = better context preservation
        optimized_chunk_size = min(chunk_size, 500)  # Cap at 500 words for better semantics
        optimized_overlap = max(overlap, 100)  # At least 100 words overlap
        chunks = [chunk for chunk in chunk_text(raw_text, chunk_size=optimized_chunk_size, overlap=optimized_overlap) if chunk.strip()]
        if not chunks:
            raise ValueError("No textual content found after processing the document.")

        _emit("embedding_progress", {"current": 0, "total": len(chunks)})
        embeddings = []
        metadatas = []
        chunk_offset = 0

        existing_metadata: List[dict] = []
        index = None
        if existing_index_path and os.path.exists(existing_index_path):
            try:
                index = load_index(existing_index_path)
                existing_metadata = load_metadata(existing_index_path)
                chunk_offset = len(existing_metadata)
                _emit("resuming_index", {"existingChunks": chunk_offset})
            except Exception:
                index = None
                existing_metadata = []
                chunk_offset = 0
        
        for idx, chunk in enumerate(chunks):
            if not chunk.strip():
                continue
            try:
                emb = self.embedder.embed_texts([chunk])[0]
                embeddings.append(emb)
                metadatas.append({
                    "chunk_id": idx + chunk_offset,
                    "text": chunk,
                    "filename": filename
                })
                _emit(
                    "embedding_progress",
                    {"current": idx + 1, "total": len(chunks)},
                )
            except Exception as e:
                error_msg = str(e)
                _emit("embedding_error", {"chunk": idx + 1, "error": error_msg})
                raise RuntimeError(
                    f"Failed to embed chunk {idx + 1}/{len(chunks)}: {error_msg}. "
                    "Please check that LM Studio is running and the embedding model is loaded."
                ) from e

        _emit("faiss_building")
        if index:
            # Adding to existing index
            if len(embeddings) > 0:
                index.add(np.array(embeddings).astype("float32"))
            index_path = existing_index_path
            combined_meta = existing_metadata + metadatas
            logger.info(f"Updated existing index at {index_path} with {len(embeddings)} new embeddings. Total chunks: {len(combined_meta)}")
        else:
            # Creating new index
            if len(embeddings) == 0:
                raise ValueError("No embeddings generated from document. Cannot create index.")
            index = build_faiss_index(embeddings)
            timestamp = int(time.time())
            index_path = os.path.join(self.index_dir, f"{bot_id}_{timestamp}.index")
            combined_meta = metadatas
            logger.info(f"Created new index at {index_path} with {len(embeddings)} embeddings")

        # Ensure directory exists
        os.makedirs(os.path.dirname(index_path), exist_ok=True)
        
        # Save index and metadata
        save_index(index, index_path)
        save_metadata(index_path, combined_meta)
        
        # Verify the save worked
        if not os.path.exists(index_path):
            raise RuntimeError(f"Failed to save index to {index_path}")
        meta_path = f"{index_path}.meta.json"
        if not os.path.exists(meta_path):
            raise RuntimeError(f"Failed to save metadata to {meta_path}")
        
        _emit("bot_ready", {"indexPath": index_path})
        return index_path, combined_meta

    def _estimate_tokens(self, text: str) -> int:
        """Rough token estimation: ~4 characters per token"""
        return len(text) // 4
    
    def _split_chunks_by_token_limit(
        self, 
        chunks: List[dict], 
        max_tokens: int = 5000,
        system_prompt: str = "",
        user_query: str = ""
    ) -> List[List[dict]]:
        """Split chunks into batches that fit within token limit"""
        # Reserve tokens for system prompt, user query, and response overhead
        overhead = self._estimate_tokens(system_prompt) + self._estimate_tokens(user_query) + 500
        available_tokens = max_tokens - overhead
        
        batches = []
        current_batch = []
        current_tokens = 0
        
        for chunk in chunks:
            chunk_text = f"[{chunk['chunk_id']}] {chunk['text']}"
            chunk_tokens = self._estimate_tokens(chunk_text)
            
            if current_tokens + chunk_tokens > available_tokens and current_batch:
                # Start a new batch
                batches.append(current_batch)
                current_batch = [chunk]
                current_tokens = chunk_tokens
            else:
                current_batch.append(chunk)
                current_tokens += chunk_tokens
        
        if current_batch:
            batches.append(current_batch)
        
        return batches
    
    def _build_prompt(self, system_prompt: str, context: str, user_query: str) -> str:
        """Build RAG prompt with context and bot instructions"""
        # Build a comprehensive system prompt that includes bot instructions
        enhanced_system = system_prompt.strip() if system_prompt.strip() else "You are a helpful AI assistant that answers questions based on the provided context."
        
        # Construct the full prompt with clear structure
        prompt = f"""{enhanced_system}

## Context from Documents:
{context}

## User Question:
{user_query}

## Instructions:
- Answer the user's question based on the context provided above
- Use the context to provide accurate, relevant information
- If the context doesn't contain relevant information, say so politely
- Cite specific parts of the context when making claims
- Be concise but thorough
- If the user is just greeting or making small talk, respond naturally while being ready to answer questions about the documents"""
        
        return prompt

    def _call_chat_stream(
        self,
        payload: Dict,
    ):
        """Stream chat completion from LM Studio"""
        # Remove trailing /v1 if present, then add /v1/chat/completions
        base = self.base_url.rstrip('/').rstrip('/v1')
        url = f"{base}/v1/chat/completions"
        try:
            # Use settings timeout (default 10 minutes) for slow 14B models
            resp = requests.post(url, json=payload, stream=True, timeout=settings.LM_STUDIO_TIMEOUT)
            resp.raise_for_status()
            for line in resp.iter_lines():
                if not line:
                    continue
                # Decode bytes to string
                if isinstance(line, bytes):
                    line = line.decode('utf-8')
                yield line
        except requests.exceptions.Timeout:
            raise RuntimeError(
                f"Timeout connecting to LM Studio at {self.base_url}. "
                "The chat model may be taking too long to respond. "
                "Please check LM Studio and try again."
            )
        except requests.exceptions.ConnectionError as e:
            raise RuntimeError(
                f"Cannot connect to LM Studio at {self.base_url}. "
                "Please ensure LM Studio is running and the chat model is loaded."
            ) from e
        except requests.HTTPError as e:
            raise RuntimeError(
                f"LM Studio returned an error: {e}. "
                "Please check that the chat model is loaded in LM Studio."
            ) from e
    
    def _call_chat_non_stream(
        self,
        payload: Dict,
    ) -> str:
        """Call chat completion without streaming (for multipart processing)"""
        # Remove trailing /v1 if present, then add /v1/chat/completions
        base = self.base_url.rstrip('/').rstrip('/v1')
        url = f"{base}/v1/chat/completions"
        
        # Disable streaming for multipart
        payload_no_stream = payload.copy()
        payload_no_stream["stream"] = False
        
        try:
            # Use settings timeout (default 10 minutes) for slow 14B models
            resp = requests.post(url, json=payload_no_stream, timeout=settings.LM_STUDIO_TIMEOUT)
            resp.raise_for_status()
            data = resp.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", "")
        except requests.exceptions.Timeout:
            raise RuntimeError(
                f"Timeout connecting to LM Studio at {self.base_url}. "
                "The chat model may be taking too long to respond."
            ) from None
        except requests.exceptions.ConnectionError as e:
            raise RuntimeError(
                f"Cannot connect to LM Studio at {self.base_url}. "
                "Please ensure LM Studio is running and the chat model is loaded."
            ) from e
        except requests.HTTPError as e:
            raise RuntimeError(
                f"LM Studio returned an error: {e}. "
                "Please check that the chat model is loaded in LM Studio."
            ) from e
    
    def _estimate_tokens(self, text: str) -> int:
        """Rough token estimation: ~4 characters per token"""
        return len(text) // 4
    
    def _split_chunks_by_token_limit(
        self, 
        chunks: List[dict], 
        max_tokens: int = 5000,
        system_prompt: str = "",
        user_query: str = ""
    ) -> List[List[dict]]:
        """Split chunks into batches that fit within token limit"""
        # Reserve tokens for system prompt, user query, and response overhead
        overhead = self._estimate_tokens(system_prompt) + self._estimate_tokens(user_query) + 500
        available_tokens = max_tokens - overhead
        
        batches = []
        current_batch = []
        current_tokens = 0
        
        for chunk in chunks:
            chunk_text = f"[{chunk['chunk_id']}] {chunk['text']}"
            chunk_tokens = self._estimate_tokens(chunk_text)
            
            if current_tokens + chunk_tokens > available_tokens and current_batch:
                # Start a new batch
                batches.append(current_batch)
                current_batch = [chunk]
                current_tokens = chunk_tokens
            else:
                current_batch.append(chunk)
                current_tokens += chunk_tokens
        
        if current_batch:
            batches.append(current_batch)
        
        return batches
    
    def _query_multipart(
        self,
        selected_chunks: List[dict],
        system_prompt: str,
        question: str,
        temperature: float,
        top_p: float,
        max_tokens: int = 5000,
    ):
        """Process query in multiple parts when context is too large"""
        import logging
        logger = logging.getLogger(__name__)
        
        # Split chunks into batches
        batches = self._split_chunks_by_token_limit(
            selected_chunks, max_tokens, system_prompt, question
        )
        
        logger.info(f"Processing query in {len(batches)} parts due to large context")
        
        # Process each batch
        partial_responses = []
        for batch_idx, batch in enumerate(batches):
            context = "\n\n".join([f"[{item['chunk_id']}] {item['text']}" for item in batch])
            
            # Adjust system prompt for multipart processing
            batch_system_prompt = (
                f"{system_prompt.strip()}\n\n"
                f"Note: This is part {batch_idx + 1} of {len(batches)}. "
                f"Focus on answering based on the provided context chunk."
            )
            
            # Use enhanced prompt building
            prompt = self._build_prompt(batch_system_prompt, context, question)
            
            payload = {
                "model": os.getenv("LM_STUDIO_CHAT_MODEL", "google/gemma-3-1b"),
                "stream": False,  # Non-streaming for multipart
                "messages": [
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": question},
                ],
                "temperature": temperature,
                "top_p": top_p,
            }
            
            try:
                response = self._call_chat_non_stream(payload)
                partial_responses.append(response)
            except Exception as e:
                logger.error(f"Error processing batch {batch_idx + 1}: {e}")
                partial_responses.append(f"[Error processing part {batch_idx + 1}]")
        
        # Combine responses
        combined_response = "\n\n".join([
            f"Part {i+1}:\n{resp}" for i, resp in enumerate(partial_responses)
        ])
        
        # Final synthesis pass to create coherent response
        synthesis_prompt = (
            f"{system_prompt.strip()}\n\n"
            f"You have received multiple partial answers to the user's question. "
            f"Synthesize them into a single, coherent, and comprehensive answer. "
            f"Remove redundancy and ensure the final answer flows naturally.\n\n"
            f"User question: {question}\n\n"
            f"Partial answers:\n{combined_response}\n\n"
            f"Provide the final synthesized answer:"
        )
        
        final_payload = {
            "model": os.getenv("LM_STUDIO_CHAT_MODEL", "google/gemma-3-1b"),
            "stream": True,  # Stream the final response
            "messages": [
                {"role": "system", "content": synthesis_prompt},
                {"role": "user", "content": "Synthesize the partial answers into a final answer."},
            ],
            "temperature": temperature,
            "top_p": top_p,
        }
        
        # Return a generator that yields the final synthesized response
        def stream_final_response():
            for line in self._call_chat_stream(final_payload):
                yield line
        
        return synthesis_prompt, selected_chunks, stream_final_response()

    def query(
        self,
        index_path: str,
        question: str,
        system_prompt: str,
        temperature: float = 0.4,
        top_p: float = 0.95,
        top_k: int = 5,
    ):
        """
        Query the RAG system with a question.
        
        Args:
            index_path: Path to FAISS index
            question: User question
            system_prompt: System prompt for the LLM
            temperature: LLM temperature
            top_p: LLM top_p parameter
            top_k: Number of chunks to retrieve
            
        Returns:
            Tuple of (prompt, selected_chunks, stream_generator)
        """
        if not os.path.exists(index_path):
            raise FileNotFoundError(f"Index not found at '{index_path}'. Re-upload documents to rebuild it.")

        index = load_index(index_path)
        metadata = load_metadata(index_path)
        if not metadata:
            raise ValueError(f"Metadata missing for index '{index_path}'.")
        
        try:
            query_vec = self.embedder.embed_texts([question])[0]
        except Exception as e:
            raise RuntimeError(
                f"Failed to embed query: {str(e)}. "
                "Please check that LM Studio is running and the embedding model is loaded."
            ) from e
        
        # Check if we have any metadata/chunks
        if not metadata or len(metadata) == 0:
            raise ValueError(
                "No documents have been vectorized for this bot yet. "
                "Please upload and vectorize documents first."
            )
        
        # For small indices (few documents), always return all chunks regardless of similarity
        # This ensures bots with 1-2 documents can still respond
        is_small_index = len(metadata) <= 3
        
        # Adaptive similarity threshold: lower for generic queries, higher for specific ones
        # Detect if query is generic (short, common words) vs specific (longer, technical)
        question_lower = question.lower().strip()
        is_generic_query = (
            len(question.split()) <= 5 or 
            any(word in question_lower for word in ['hello', 'hi', 'hey', 'help', 'what', 'how', 'why', 'when', 'where', 'sales', 'tell', 'show'])
        )
        
        # For small indices or generic queries, use 0.0 threshold to get all results
        # For larger indices with specific queries, use a low threshold
        if is_small_index or is_generic_query:
            base_threshold = 0.0  # Get all results
        else:
            base_threshold = 0.2  # Low threshold for specific queries
        
        # Search with expanded top_k to get more candidates
        search_k = min(top_k * 3, len(metadata)) if not is_small_index else len(metadata)
        idxs, distances, similarities = search(index, query_vec, top_k=search_k, similarity_threshold=base_threshold)

        # Build selected chunks with relevance scores
        selected = []
        for idx, dist, sim in zip(idxs, distances, similarities):
            if 0 <= idx < len(metadata):
                chunk = metadata[idx].copy()
                chunk['similarity'] = sim
                chunk['distance'] = dist
                selected.append(chunk)
        
        # Sort by similarity (highest first)
        selected.sort(key=lambda x: x.get('similarity', 0), reverse=True)
        
        # For small indices or generic queries, always return all available chunks
        if is_small_index:
            # Return all chunks for small indices
            selected = selected[:top_k] if len(selected) > top_k else selected
        elif is_generic_query:
            # For generic queries, take top_k chunks regardless of similarity
            selected = selected[:top_k] if len(selected) > top_k else selected
        else:
            # For specific queries, filter by minimum similarity but be very lenient
            min_similarity = 0.1  # Very low threshold to allow more results
            selected = [item for item in selected if item.get('similarity', 0) >= min_similarity][:top_k]
        
        # Fallback: if still no chunks, return top chunks anyway (for conversational queries)
        # This should rarely happen now, but keep as safety net
        if not selected and len(metadata) > 0:
            # Get top chunks regardless of similarity for fallback
            idxs_fallback, distances_fallback, similarities_fallback = search(
                index, query_vec, top_k=min(top_k, len(metadata)), similarity_threshold=0.0
            )
            selected = []
            for idx, dist, sim in zip(idxs_fallback, distances_fallback, similarities_fallback):
                if 0 <= idx < len(metadata):
                    chunk = metadata[idx].copy()
                    chunk['similarity'] = sim
                    chunk['distance'] = dist
                    selected.append(chunk)
            selected.sort(key=lambda x: x.get('similarity', 0), reverse=True)
            # Take all available chunks if we have fewer than top_k
            selected = selected[:top_k] if len(selected) >= top_k else selected
        
        # Final check: if still no chunks, force return all available chunks
        # This should never happen with our logic, but as absolute fallback
        if not selected and len(metadata) > 0:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"No chunks selected after all fallbacks. Forcing return of all chunks. Query: {question}, Metadata: {len(metadata)}")
            # Force return all chunks as last resort
            for idx in range(min(top_k, len(metadata))):
                if idx < len(metadata):
                    chunk = metadata[idx].copy()
                    chunk['similarity'] = 0.5  # Default similarity
                    chunk['distance'] = 1.0  # Default distance
                    selected.append(chunk)
        
        # Absolute final check: if still no chunks, raise error
        if not selected:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"CRITICAL: No chunks available. Query: {question}, Metadata count: {len(metadata)}, Index vectors: {index.ntotal if hasattr(index, 'ntotal') else 'unknown'}")
            raise ValueError(
                f"I couldn't find any relevant information about '{question}' in the uploaded documents. "
                "Please try:\n"
                "- Rephrasing your question\n"
                "- Uploading documents that contain information about this topic\n"
                "- Checking that the bot has documents attached"
            )
        
        # Check if we need multipart processing (context length > 5000 tokens)
        context = "\n\n".join([f"[{item['chunk_id']}] {item['text']}" for item in selected])
        context_tokens = self._estimate_tokens(context)
        max_context_tokens = 5000  # Safe limit leaving room for prompt and response (model limit is 9500)
        
        if context_tokens > max_context_tokens:
            # Split into batches and process multipart
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Context too large ({context_tokens} tokens), using multipart processing")
            return self._query_multipart(
                selected, system_prompt, question, temperature, top_p, max_context_tokens
            )
        else:
            # Process normally in single request
            # Build enhanced prompt with system instructions and context
            enhanced_prompt = self._build_prompt(system_prompt, context, question)
            
            # Use proper message structure: system prompt with instructions, user message with question
            payload = {
                "model": os.getenv("LM_STUDIO_CHAT_MODEL", "google/gemma-3-1b"),
                "stream": True,
                "messages": [
                    {"role": "system", "content": enhanced_prompt},
                    {"role": "user", "content": question},
                ],
                "temperature": temperature,
                "top_p": top_p,
            }
            return enhanced_prompt, selected, self._call_chat_stream(payload)

