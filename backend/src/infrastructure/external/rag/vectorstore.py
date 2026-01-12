"""FAISS vector store utilities for RAG"""

import json
import logging
import os
from typing import List, Optional, Tuple

from src.infrastructure.external.platform_detector import PlatformDetector

logger = logging.getLogger(__name__)

# Try to import FAISS - supports both CPU and GPU versions
faiss = None
np = None
_use_gpu = False
_gpu_resources = None

try:
    import numpy as np
except ImportError:
    np = None

try:
    import faiss
    # Check if GPU is available and platform supports it
    platform_info = PlatformDetector.get_gpu_info()
    if platform_info and platform_info.get("has_cuda"):
        try:
            # Try to use GPU resources
            _gpu_resources = faiss.StandardGpuResources()
            _use_gpu = True
            logger.debug(f"FAISS GPU acceleration enabled on {platform_info.get('gpu_name', 'NVIDIA GPU')}")
        except Exception as e:
            logger.debug(f"FAISS GPU not available, using CPU: {e}")
            _use_gpu = False
    else:
        logger.debug("FAISS using CPU (no CUDA GPU detected or Mac platform)")
except ImportError:
    faiss = None


def build_faiss_index(embeddings: List[List[float]], use_gpu: Optional[bool] = None) -> "faiss.IndexFlatL2":
    """
    Build a FAISS index from embeddings with automatic GPU detection.
    
    Args:
        embeddings: List of embedding vectors
        use_gpu: Optional override. If None, auto-detects based on platform.
        
    Returns:
        FAISS index (CPU or GPU)
        
    Raises:
        ImportError: If faiss or numpy is not installed
        ValueError: If no embeddings provided
    """
    if faiss is None or np is None:
        backend_name, install_cmd = PlatformDetector.get_faiss_backend()
        raise ImportError(
            f"faiss and numpy are required. "
            f"Install with: {install_cmd}"
        )
    
    if not embeddings:
        raise ValueError("No embeddings provided to build index.")
    
    dim = len(embeddings[0])
    embeddings_array = np.array(embeddings).astype("float32")
    
    # Determine GPU usage
    should_use_gpu = use_gpu if use_gpu is not None else _use_gpu
    
    if should_use_gpu and _gpu_resources is not None:
        try:
            # Create CPU index first
            cpu_index = faiss.IndexFlatL2(dim)
            # Transfer to GPU
            gpu_index = faiss.index_cpu_to_gpu(_gpu_resources, 0, cpu_index)
            gpu_index.add(embeddings_array)
            logger.info(f"Built FAISS index on GPU with {len(embeddings)} vectors")
            return gpu_index
        except Exception as e:
            logger.warning(f"GPU index creation failed, falling back to CPU: {e}")
            # Fall back to CPU
            index = faiss.IndexFlatL2(dim)
            index.add(embeddings_array)
            return index
    else:
        # Use CPU index
        index = faiss.IndexFlatL2(dim)
        index.add(embeddings_array)
        logger.info(f"Built FAISS index on CPU with {len(embeddings)} vectors")
        return index


def save_index(index: "faiss.IndexFlatL2", path: str) -> None:
    """Save FAISS index to disk"""
    if faiss is None:
        raise ImportError("faiss is required to save index")
    
    os.makedirs(os.path.dirname(path), exist_ok=True)
    faiss.write_index(index, path)


def load_index(path: str, use_gpu: Optional[bool] = None) -> "faiss.IndexFlatL2":
    """
    Load FAISS index from disk with optional GPU acceleration.
    
    Args:
        path: Path to index file
        use_gpu: Optional override. If None, auto-detects based on platform.
    
    Returns:
        FAISS index (CPU or GPU)
    """
    if faiss is None:
        raise ImportError("faiss is required to load index")
    
    cpu_index = faiss.read_index(path)
    
    # Determine GPU usage
    should_use_gpu = use_gpu if use_gpu is not None else _use_gpu
    
    if should_use_gpu and _gpu_resources is not None:
        try:
            # Transfer to GPU
            gpu_index = faiss.index_cpu_to_gpu(_gpu_resources, 0, cpu_index)
            logger.info(f"Loaded FAISS index to GPU from {path}")
            return gpu_index
        except Exception as e:
            logger.warning(f"GPU index loading failed, using CPU: {e}")
            return cpu_index
    
    return cpu_index


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
                              If 0.0, returns top_k results regardless of similarity
        
    Returns:
        Tuple of (indices, distances, similarities)
    """
    if faiss is None or np is None:
        raise ImportError("faiss and numpy are required for search")
    
    # Get total number of vectors in index
    total_vectors = index.ntotal if hasattr(index, 'ntotal') else 0
    if total_vectors == 0:
        return [], [], []
    
    # Search for candidates
    search_k = min(top_k * 3, total_vectors) if similarity_threshold > 0 else min(top_k, total_vectors)
    D, I = index.search(np.array([query_vector]).astype("float32"), search_k)
    
    indices = []
    distances = []
    similarities = []
    
    # If threshold is 0.0, return top_k results regardless of similarity
    if similarity_threshold == 0.0:
        for idx, dist in zip(I[0][:top_k], D[0][:top_k]):
            indices.append(int(idx))
            distances.append(float(dist))
            similarity = 1.0 / (1.0 + dist) if dist >= 0 else 0.0
            similarities.append(float(similarity))
        return indices, distances, similarities
    
    # Otherwise, filter by similarity threshold
    for idx, dist in zip(I[0], D[0]):
        # Convert L2 distance to similarity score (0-1)
        # Using 1 / (1 + distance) to normalize
        similarity = 1.0 / (1.0 + dist) if dist >= 0 else 0.0
        
        # Filter by similarity threshold
        if similarity >= similarity_threshold:
            indices.append(int(idx))
            distances.append(float(dist))
            similarities.append(float(similarity))
            
            # Stop once we have enough results
            if len(indices) >= top_k:
                break
    
    return indices, distances, similarities

