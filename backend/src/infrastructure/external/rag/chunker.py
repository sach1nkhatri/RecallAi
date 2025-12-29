"""Text chunking utilities for RAG"""

import re
from typing import List, Tuple


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
    """
    Split text into semantic chunks using sentence boundaries.
    Better for RAG as it preserves semantic meaning.
    
    Args:
        text: Text to chunk
        chunk_size: Target chunk size in words (reduced for better semantic coherence)
        overlap: Number of words to overlap between chunks
        
    Returns:
        List of text chunks
    """
    # Split by sentences (handle multiple sentence endings)
    sentence_endings = re.compile(r'[.!?]\s+')
    sentences = sentence_endings.split(text)
    
    # Filter out empty sentences
    sentences = [s.strip() for s in sentences if s.strip()]
    
    if not sentences:
        # Fallback to word-based chunking if no sentence boundaries found
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
    
    chunks = []
    current_chunk = []
    current_size = 0
    
    for sentence in sentences:
        sentence_words = len(sentence.split())
        
        # If adding this sentence would exceed chunk size, finalize current chunk
        if current_size + sentence_words > chunk_size and current_chunk:
            chunks.append(" ".join(current_chunk))
            
            # Start new chunk with overlap (keep last few sentences)
            overlap_sentences = []
            overlap_size = 0
            for s in reversed(current_chunk):
                s_words = len(s.split())
                if overlap_size + s_words <= overlap:
                    overlap_sentences.insert(0, s)
                    overlap_size += s_words
                else:
                    break
            current_chunk = overlap_sentences
            current_size = overlap_size
        
        current_chunk.append(sentence)
        current_size += sentence_words
    
    # Add final chunk
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    
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

