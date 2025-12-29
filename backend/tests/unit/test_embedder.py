"""Unit tests for Embedder"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from src.infrastructure.external.rag.embedder import LMStudioEmbedder


class TestLMStudioEmbedder:
    """Test LMStudioEmbedder class"""
    
    @pytest.fixture
    def embedder(self):
        """Create embedder instance with mocked session"""
        with patch('src.infrastructure.external.rag.embedder.requests.Session') as mock_session:
            mock_sess = Mock()
            mock_session.return_value = mock_sess
            embedder = LMStudioEmbedder('http://localhost:1234/v1')
            embedder.session = mock_sess
            yield embedder
    
    def test_detect_embedding_model_with_env(self, embedder):
        """Test model detection from environment variable"""
        with patch.dict('os.environ', {'LM_STUDIO_EMBED_MODEL': 'custom-model'}):
            embedder._detect_embedding_model()
            assert embedder.model == 'custom-model'
    
    def test_detect_embedding_model_auto(self, embedder):
        """Test auto-detection of embedding model"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'data': [
                {'id': 'text-embedding-model', 'object': 'model'},
                {'id': 'chat-model', 'object': 'model'}
            ]
        }
        embedder.session.get.return_value = mock_response
        
        # Reset call count from initialization
        embedder.session.get.reset_mock()
        
        embedder._detect_embedding_model()
        
        assert embedder.model == 'text-embedding-model'
        # Should be called at least once (may be called during init too)
        assert embedder.session.get.call_count >= 1
    
    def test_detect_embedding_model_no_models(self, embedder):
        """Test when no models are available"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'data': []}
        embedder.session.get.return_value = mock_response
        
        embedder._detect_embedding_model()
        
        assert embedder.model is None
    
    def test_embed_texts_success(self, embedder):
        """Test successful embedding"""
        embedder.model = 'test-model'
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'data': [{'embedding': [0.1, 0.2, 0.3]}]
        }
        mock_response.raise_for_status = Mock()
        embedder.session.post.return_value = mock_response
        embedder._check_connection = Mock(return_value=True)
        
        result = embedder.embed_texts(['test text'])
        
        assert len(result) == 1
        assert result[0] == [0.1, 0.2, 0.3]
    
    def test_embed_texts_without_model(self, embedder):
        """Test embedding without specifying model"""
        embedder.model = None
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'data': [{'embedding': [0.1, 0.2]}]
        }
        mock_response.raise_for_status = Mock()
        embedder.session.post.return_value = mock_response
        embedder._check_connection = Mock(return_value=True)
        
        result = embedder.embed_texts(['test'])
        
        assert len(result) == 1
        # Verify model was not in payload
        call_args = embedder.session.post.call_args
        payload = call_args[1]['json']
        assert 'model' not in payload
    
    def test_embed_texts_connection_error(self, embedder):
        """Test embedding with connection error"""
        embedder._check_connection = Mock(return_value=False)
        
        with pytest.raises(RuntimeError, match="Cannot connect to LM Studio"):
            embedder.embed_texts(['test'])
    
    def test_embed_texts_empty_input(self, embedder):
        """Test embedding with empty input"""
        # Mock connection check to avoid actual network calls
        embedder._check_connection = Mock(return_value=True)
        
        result = embedder.embed_texts([])
        assert result == []
        
        # Empty/whitespace strings are skipped, so result should be empty
        result = embedder.embed_texts(['', '   '])
        assert result == []

