"""RAG index service for chunking and embedding repository code"""

import logging
import os
import time
from pathlib import Path
from typing import List, Tuple

from src.config.settings import settings
from src.infrastructure.external.rag import RAGEngine
from src.infrastructure.external.rag.chunker import chunk_text
from src.infrastructure.external.rag.embedder import LMStudioEmbedder
from src.infrastructure.external.rag.vectorstore import (
    build_faiss_index,
    load_index,
    load_metadata,
    save_index,
    save_metadata,
    search,
)

logger = logging.getLogger(__name__)


class RAGIndexService:
    """Service for building and querying RAG indices"""
    
    def __init__(self, base_url: str):
        self.rag_engine = RAGEngine(base_url, str(settings.RAG_INDEX_PATH))
        self.embedder = LMStudioEmbedder(base_url)
    
    def build_repo_index(
        self,
        repo_id: str,
        repo_files: List[dict]  # List of {path, content}
    ) -> Tuple[str, List[dict]]:
        """
        Build RAG index from repository files.
        
        Args:
            repo_id: Unique repository identifier
            repo_files: List of dicts with 'path' and 'content' keys
            
        Returns:
            Tuple of (index_path, metadata_list)
        """
        logger.info(f"Building RAG index for repo {repo_id} with {len(repo_files)} files")
        
        all_chunks = []
        all_metadatas = []
        chunk_id = 0
        
        # Process each file
        logger.info(f"Processing {len(repo_files)} files for chunking...")
        for file_idx, file_info in enumerate(repo_files, 1):
            path = file_info.get("path", "")
            content = file_info.get("content", "")
            
            if not content.strip():
                continue
            
            logger.debug(f"Chunking file {file_idx}/{len(repo_files)}: {path}")
            # Chunk the file content
            chunks = chunk_text(
                content,
                chunk_size=settings.RAG_CHUNK_SIZE,
                overlap=settings.RAG_CHUNK_OVERLAP
            )
            logger.debug(f"Created {len(chunks)} chunks from {path}")
            
            # Create metadata for each chunk
            for chunk in chunks:
                if not chunk.strip():
                    continue
                
                all_chunks.append(chunk)
                all_metadatas.append({
                    "chunk_id": chunk_id,
                    "text": chunk,
                    "file_path": path,
                    "chunk_index": len(all_chunks) - 1
                })
                chunk_id += 1
        
        logger.info(f"Created {len(all_chunks)} chunks from repository")
        
        if not all_chunks:
            raise ValueError("No chunks created from repository files")
        
        # Generate embeddings
        logger.info(f"Generating embeddings for {len(all_chunks)} chunks (this may take several minutes)...")
        embeddings = []
        for idx, chunk in enumerate(all_chunks):
            try:
                logger.debug(f"Embedding chunk {idx + 1}/{len(all_chunks)}")
                emb = self.embedder.embed_texts([chunk])[0]
                embeddings.append(emb)
                # Log progress every 5 chunks for better visibility
                if (idx + 1) % 5 == 0 or (idx + 1) == len(all_chunks):
                    logger.info(f"Embedded {idx + 1}/{len(all_chunks)} chunks ({((idx + 1) / len(all_chunks) * 100):.1f}%)")
            except Exception as e:
                logger.error(f"Failed to embed chunk {idx}: {e}")
                raise RuntimeError(f"Failed to generate embeddings: {str(e)}") from e
        logger.info(f"Completed embedding all {len(all_chunks)} chunks")
        
        # Build FAISS index
        logger.info("Building FAISS index...")
        index = build_faiss_index(embeddings)
        
        # Save index
        timestamp = int(time.time())
        index_path = os.path.join(settings.RAG_INDEX_PATH, f"{repo_id}_{timestamp}.index")
        save_index(index, index_path)
        save_metadata(index_path, all_metadatas)
        
        logger.info(f"Saved index to {index_path}")
        
        return index_path, all_metadatas
    
    def query_index(
        self,
        index_path: str,
        queries: List[str],
        top_k: int = None
    ) -> List[dict]:
        """
        Query the RAG index with multiple queries and return unique chunks.
        
        Args:
            index_path: Path to FAISS index
            queries: List of query strings
            top_k: Number of results per query (defaults to settings.RAG_TOP_K)
            
        Returns:
            List of unique chunk metadata dictionaries
        """
        if top_k is None:
            top_k = settings.RAG_TOP_K
        
        logger.info(f"Querying index: {index_path} with {len(queries)} queries, top_k={top_k}")
        logger.debug(f"Queries: {queries}")
        
        if not os.path.exists(index_path):
            logger.error(f"Index not found: {index_path}")
            raise FileNotFoundError(f"Index not found: {index_path}")
        
        index = load_index(index_path)
        metadata = load_metadata(index_path)
        logger.info(f"Loaded index with {len(metadata)} chunks")
        
        if not metadata:
            raise ValueError(f"No metadata found for index {index_path}")
        
        # Collect unique chunks from all queries
        seen_chunk_ids = set()
        selected_chunks = []
        
        for query_idx, query in enumerate(queries, 1):
            try:
                logger.debug(f"Processing query {query_idx}/{len(queries)}: '{query[:50]}...'")
                # Embed query
                query_vec = self.embedder.embed_texts([query])[0]
                logger.debug(f"Query embedded, vector length: {len(query_vec)}")
                
                # Search index with very low threshold (0.1) to get more results
                # If still no results, try with no threshold (0.0) as fallback
                idxs, distances, similarities = search(index, query_vec, top_k=top_k, similarity_threshold=0.1)
                logger.info(f"Query '{query[:50]}...' found {len(idxs)} results (threshold: 0.1)")
                
                # Fallback: if no results with 0.1, try with no threshold
                if len(idxs) == 0:
                    logger.warning(f"No results with threshold 0.1, trying without threshold...")
                    idxs, distances, similarities = search(index, query_vec, top_k=top_k, similarity_threshold=0.0)
                    logger.info(f"Query '{query[:50]}...' found {len(idxs)} results (no threshold)")
                
                if distances:
                    logger.debug(f"Similarity distances: {distances[:5]}")
                    logger.debug(f"Similarity scores: {similarities[:5]}")
                
                # Add unique chunks (only if they have text content)
                added_count = 0
                for idx in idxs:
                    if 0 <= idx < len(metadata):
                        chunk_meta = metadata[idx]
                        # Validate chunk has text content
                        chunk_text = chunk_meta.get("text", "").strip()
                        if not chunk_text:
                            logger.warning(f"Chunk {idx} has no text content, skipping")
                            continue
                        if idx not in seen_chunk_ids:
                            seen_chunk_ids.add(idx)
                            selected_chunks.append(chunk_meta)
                            added_count += 1
                logger.debug(f"Added {added_count} new chunks from this query")
            except Exception as e:
                logger.error(f"Failed to query '{query}': {e}", exc_info=True)
                continue
        
        logger.info(f"Retrieved {len(selected_chunks)} unique chunks from {len(queries)} queries")
        
        # Final fallback: if still no chunks, get first N chunks from index directly
        if len(selected_chunks) == 0:
            logger.error(f"No chunks found for queries: {queries}")
            logger.warning("Using final fallback: getting first chunks from index directly...")
            # Get first top_k chunks from metadata (filter out empty chunks)
            fallback_chunks = []
            for chunk in metadata[:min(top_k * 2, len(metadata))]:
                if chunk.get("text", "").strip():
                    fallback_chunks.append(chunk)
                if len(fallback_chunks) >= top_k:
                    break
            logger.info(f"Fallback retrieved {len(fallback_chunks)} chunks directly from index")
            if fallback_chunks:
                selected_chunks = fallback_chunks
            else:
                logger.error("CRITICAL: Index metadata is empty! Cannot retrieve any chunks.")
        
        return selected_chunks

