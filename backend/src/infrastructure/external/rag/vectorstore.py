"""FAISS vector store utilities for RAG"""

import json
import os
from typing import List, Tuple

try:
    import faiss
    import numpy as np
except ImportError:
    faiss = None  # type: ignore
    np = None  # type: ignore


def build_faiss_index(embeddings: List[List[float]]) -> "faiss.IndexFlatL2":
    """
    Build a FAISS index from embeddings.
    
    Args:
        embeddings: List of embedding vectors
        
    Returns:
        FAISS index
        
    Raises:
        ImportError: If faiss or numpy is not installed
        ValueError: If no embeddings provided
    """
    if faiss is None or np is None:
        raise ImportError(
            "faiss-cpu or faiss-gpu and numpy are required. "
            "Install with: pip install faiss-cpu numpy"
        )
    
    if not embeddings:
        raise ValueError("No embeddings provided to build index.")
    
    dim = len(embeddings[0])
    index = faiss.IndexFlatL2(dim)
    index.add(np.array(embeddings).astype("float32"))
    return index


def save_index(index: "faiss.IndexFlatL2", path: str) -> None:
    """Save FAISS index to disk"""
    if faiss is None:
        raise ImportError("faiss is required to save index")
    
    os.makedirs(os.path.dirname(path), exist_ok=True)
    faiss.write_index(index, path)


def load_index(path: str) -> "faiss.IndexFlatL2":
    """Load FAISS index from disk"""
    if faiss is None:
        raise ImportError("faiss is required to load index")
    
    return faiss.read_index(path)


def save_metadata(path: str, metadatas: List[dict]) -> str:
    """Save metadata to JSON file"""
    meta_path = f"{path}.meta.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadatas, f, ensure_ascii=False, indent=2)
    return meta_path


def load_metadata(path: str) -> List[dict]:
    """Load metadata from JSON file"""
    meta_path = f"{path}.meta.json"
    if not os.path.exists(meta_path):
        return []
    with open(meta_path, "r", encoding="utf-8") as f:
        return json.load(f)


def search(
    index: "faiss.IndexFlatL2",
    query_vector: List[float],
    top_k: int = 5,
    similarity_threshold: float = 0.7
) -> Tuple[List[int], List[float], List[float]]:
    """
    Search for similar vectors in the index with similarity filtering.
    
    Args:
        index: FAISS index
        query_vector: Query embedding vector
        top_k: Number of results to return
        similarity_threshold: Minimum similarity score (0-1, higher = more similar)
                              L2 distance is converted to similarity: 1 / (1 + distance)
        
    Returns:
        Tuple of (indices, distances, similarities)
    """
    if faiss is None or np is None:
        raise ImportError("faiss and numpy are required for search")
    
    # Search for more candidates to filter by similarity
    search_k = min(top_k * 3, index.ntotal) if hasattr(index, 'ntotal') else top_k * 3
    D, I = index.search(np.array([query_vector]).astype("float32"), search_k)
    
    indices = []
    distances = []
    similarities = []
    
    for idx, dist in zip(I[0], D[0]):
        # Convert L2 distance to similarity score (0-1)
        # Using 1 / (1 + distance) to normalize
        similarity = 1.0 / (1.0 + dist)
        
        # Filter by similarity threshold
        if similarity >= similarity_threshold:
            indices.append(int(idx))
            distances.append(float(dist))
            similarities.append(float(similarity))
            
            # Stop once we have enough results
            if len(indices) >= top_k:
                break
    
    return indices, distances, similarities

