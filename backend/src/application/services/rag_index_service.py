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
        for file_info in repo_files:
            path = file_info.get("path", "")
            content = file_info.get("content", "")
            
            if not content.strip():
                continue
            
            # Chunk the file content
            chunks = chunk_text(
                content,
                chunk_size=settings.RAG_CHUNK_SIZE,
                overlap=settings.RAG_CHUNK_OVERLAP
            )
            
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
        logger.info("Generating embeddings...")
        embeddings = []
        for idx, chunk in enumerate(all_chunks):
            try:
                emb = self.embedder.embed_texts([chunk])[0]
                embeddings.append(emb)
                if (idx + 1) % 10 == 0:
                    logger.info(f"Embedded {idx + 1}/{len(all_chunks)} chunks")
            except Exception as e:
                logger.error(f"Failed to embed chunk {idx}: {e}")
                raise RuntimeError(f"Failed to generate embeddings: {str(e)}") from e
        
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
        
        if not os.path.exists(index_path):
            raise FileNotFoundError(f"Index not found: {index_path}")
        
        index = load_index(index_path)
        metadata = load_metadata(index_path)
        
        if not metadata:
            raise ValueError(f"No metadata found for index {index_path}")
        
        # Collect unique chunks from all queries
        seen_chunk_ids = set()
        selected_chunks = []
        
        for query in queries:
            try:
                # Embed query
                query_vec = self.embedder.embed_texts([query])[0]
                
                # Search index
                idxs, _ = search(index, query_vec, top_k=top_k)
                
                # Add unique chunks
                for idx in idxs:
                    if 0 <= idx < len(metadata) and idx not in seen_chunk_ids:
                        seen_chunk_ids.add(idx)
                        selected_chunks.append(metadata[idx])
            except Exception as e:
                logger.warning(f"Failed to query '{query}': {e}")
                continue
        
        logger.info(f"Retrieved {len(selected_chunks)} unique chunks from {len(queries)} queries")
        return selected_chunks

