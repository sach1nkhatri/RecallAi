"""RAG Engine for document vectorization and querying"""

import json
import os
import time
from typing import Callable, Dict, List, Optional, Tuple

import requests
import numpy as np

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
        chunk_size: int = 700,
        overlap: int = 80,
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

        _emit("chunking")
        chunks = [chunk for chunk in chunk_text(raw_text, chunk_size=chunk_size, overlap=overlap) if chunk.strip()]
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
                metadatas.append({"chunk_id": idx + chunk_offset, "text": chunk})
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
            index.add(np.array(embeddings).astype("float32"))
            index_path = existing_index_path
            combined_meta = existing_metadata + metadatas
        else:
            index = build_faiss_index(embeddings)
            timestamp = int(time.time())
            index_path = os.path.join(self.index_dir, f"{bot_id}_{timestamp}.index")
            combined_meta = metadatas

        save_index(index, index_path)
        save_metadata(index_path, combined_meta)
        _emit("bot_ready", {"indexPath": index_path})
        return index_path, combined_meta

    def _build_prompt(self, system_prompt: str, context: str, user_query: str) -> str:
        """Build RAG prompt with context"""
        return (
            f"{system_prompt.strip()}\n\n"
            f"Context:\n{context}\n\n"
            f"User question: {user_query}\n"
            f"Answer with citations for each fact."
        )

    def _call_chat_stream(
        self,
        payload: Dict,
    ):
        """Stream chat completion from LM Studio"""
        url = f"{self.base_url}/v1/chat/completions"
        try:
            resp = requests.post(url, json=payload, stream=True, timeout=120)
            resp.raise_for_status()
            for line in resp.iter_lines():
                if not line:
                    continue
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
        
        idxs, _ = search(index, query_vec, top_k=top_k)

        selected = [metadata[i] for i in idxs if 0 <= i < len(metadata)]
        selected = [item for item in selected if item]
        if not selected:
            raise ValueError(
                f"I couldn't find any relevant information about '{question}' in the uploaded documents. "
                "Please try:\n"
                "- Rephrasing your question\n"
                "- Uploading documents that contain information about this topic\n"
                "- Checking that the bot has documents attached"
            )
        context = "\n\n".join([f"[{item['chunk_id']}] {item['text']}" for item in selected])
        prompt = self._build_prompt(system_prompt, context, question)

        payload = {
            "model": os.getenv("LM_STUDIO_CHAT_MODEL", "google/gemma-3-1b"),
            "stream": True,
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": question},
            ],
            "temperature": temperature,
            "top_p": top_p,
        }

        return prompt, selected, self._call_chat_stream(payload)

