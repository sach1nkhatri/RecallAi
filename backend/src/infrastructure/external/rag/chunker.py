"""Text chunking utilities for RAG"""

from typing import List, Tuple


def chunk_text(text: str, chunk_size: int = 700, overlap: int = 80) -> List[str]:
    """
    Split text into roughly token-sized chunks using words as a proxy.
    
    Args:
        text: Text to chunk
        chunk_size: Target chunk size in words
        overlap: Number of words to overlap between chunks
        
    Returns:
        List of text chunks
    """
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = min(len(words), start + chunk_size)
        chunk_words = words[start:end]
        chunks.append(" ".join(chunk_words))
        if end == len(words):
            break
        start = end - overlap
    return chunks


def summarize_chunks(chunks: List[str]) -> List[Tuple[int, int]]:
    """
    Utility to map chunk index to word span.
    
    Args:
        chunks: List of text chunks
        
    Returns:
        List of (start, end) word span tuples
    """
    spans = []
    cursor = 0
    for chunk in chunks:
        length = len(chunk.split())
        spans.append((cursor, cursor + length))
        cursor += length
    return spans

