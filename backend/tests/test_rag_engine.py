"""Tests for RAG Engine"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from src.infrastructure.external.rag.rag_engine import RAGEngine


class TestRAGEngine:
    """Test RAG Engine functionality"""
    
    @pytest.fixture
    def rag_engine(self, mock_embedder):
        """Create RAGEngine instance with mocked dependencies"""
        engine = RAGEngine(
            base_url='http://localhost:1234',
            index_dir='/tmp/test_indices'
        )
        engine.embedder = mock_embedder
        yield engine
    
    def test_vectorize_file(self, rag_engine, mock_embedder, tmp_path):
        """Test file vectorization"""
        test_file = tmp_path / "test.txt"
        test_file.write_text("This is a test document. " * 100)
        
        with patch('src.infrastructure.external.rag.rag_engine.build_faiss_index') as mock_build:
            with patch('src.infrastructure.external.rag.rag_engine.save_index') as mock_save:
                with patch('src.infrastructure.external.rag.rag_engine.save_metadata') as mock_save_meta:
                    mock_index = Mock()
                    mock_build.return_value = mock_index
                    
                    index_path, metadata = rag_engine.vectorize_file(
                        str(test_file),
                        bot_id='test-bot',
                        chunk_size=700,
                        overlap=80
                    )
                    
                    assert index_path is not None
                    assert len(metadata) > 0
                    mock_embedder.embed_texts.assert_called()
    
    def test_query(self, rag_engine, mock_embedder, tmp_path):
        """Test querying the RAG system"""
        index_path = tmp_path / "test.index"
        index_path.touch()
        
        with patch('src.infrastructure.external.rag.rag_engine.load_index') as mock_load:
            with patch('src.infrastructure.external.rag.rag_engine.load_metadata') as mock_load_meta:
                with patch('src.infrastructure.external.rag.rag_engine.search') as mock_search:
                    mock_index = Mock()
                    mock_load.return_value = mock_index
                    mock_load_meta.return_value = [
                        {'chunk_id': 0, 'text': 'Test content 1'},
                        {'chunk_id': 1, 'text': 'Test content 2'}
                    ]
                    mock_search.return_value = ([0], [[0.9]])
                    
                    prompt, selected, stream = rag_engine.query(
                        str(index_path),
                        question='test query',
                        system_prompt='You are a helpful assistant.',
                        top_k=2
                    )
                    
                    assert prompt is not None
                    assert len(selected) > 0
                    mock_embedder.embed_texts.assert_called()

