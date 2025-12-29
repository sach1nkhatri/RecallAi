"""Pytest configuration and fixtures"""

import pytest
import os
import sys
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch

# Add src to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from flask import Flask
from src.infrastructure.api.routes import create_app


@pytest.fixture
def app():
    """Create test Flask application"""
    # Set test environment variables
    os.environ['FLASK_ENV'] = 'testing'
    os.environ['MONGODB_URI'] = os.getenv('TEST_MONGODB_URI', 'mongodb://localhost:27017/test_recall_ai')
    os.environ['MONGODB_DB_NAME'] = 'test_recall_ai'
    os.environ['LM_STUDIO_BASE_URL'] = 'http://localhost:1234/v1'
    
    app = create_app()
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    
    yield app


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def mock_lm_studio():
    """Mock LM Studio API responses"""
    with patch('src.infrastructure.external.lm_studio_client.requests.post') as mock_post:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'choices': [{
                'message': {
                    'content': 'Test documentation response'
                }
            }]
        }
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response
        yield mock_post


@pytest.fixture
def mock_embedder():
    """Mock embedding service"""
    with patch('src.infrastructure.external.rag.embedder.LMStudioEmbedder') as mock_embed:
        mock_instance = Mock()
        mock_instance.embed_texts.return_value = [[0.1] * 384]  # Mock embedding vector
        mock_instance._detect_embedding_model = Mock()
        mock_embed.return_value = mock_instance
        yield mock_instance


@pytest.fixture
def mock_mongo():
    """Mock MongoDB connection"""
    with patch('src.infrastructure.storage.database.get_client') as mock_client:
        with patch('src.infrastructure.storage.database.get_database') as mock_db:
            mock_database = MagicMock()
            mock_collection = Mock()
            mock_collection.find.return_value = []
            mock_collection.find_one.return_value = None
            mock_collection.find_one_and_update.return_value = None
            mock_collection.insert_one.return_value = Mock(inserted_id='test_id')
            mock_collection.update_one.return_value = Mock(modified_count=1)
            mock_collection.delete_one.return_value = Mock(deleted_count=1)
            mock_database.__getitem__.return_value = mock_collection
            mock_db.return_value = mock_database
            yield mock_database

