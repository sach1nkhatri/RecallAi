"""Integration tests for Repository Documentation routes"""

import pytest
import json
from unittest.mock import patch, Mock


class TestRepoRoutes:
    """Test repository documentation endpoints"""
    
    def test_ingest_repository(self, client, mock_mongo):
        """Test POST /api/repo/ingest"""
        with patch('src.infrastructure.api.repo_routes.github_service') as mock_github:
            with patch('src.infrastructure.api.repo_routes.rag_index_service') as mock_rag:
                mock_github.scan_repository.return_value = {
                    'files': [{'path': 'test.py', 'content': 'code'}],
                    'total_files': 1
                }
                mock_rag.index_repository.return_value = {'index_id': 'test-index'}
                
                response = client.post(
                    '/api/repo/ingest',
                    data=json.dumps({
                        'repo_url': 'https://github.com/user/repo'
                    }),
                    content_type='application/json',
                    headers={'X-User-ID': 'user1', 'Authorization': 'Bearer test-token'}
                )
                
                assert response.status_code == 200
                data = json.loads(response.data)
                assert 'success' in data
    
    def test_generate_documentation(self, client, mock_mongo, mock_lm_studio):
        """Test POST /api/repo/generate"""
        with patch('src.infrastructure.api.repo_routes.rag_index_service') as mock_rag:
            with patch('src.infrastructure.api.repo_routes.user_service') as mock_user:
                mock_rag.generate_documentation.return_value = {
                    'markdown': '# Test Documentation',
                    'pdf_url': '/uploads/test.pdf'
                }
                mock_user.check_usage_limit.return_value = (True, {}, None)
                mock_user.increment_usage.return_value = True
                
                response = client.post(
                    '/api/repo/generate',
                    data=json.dumps({
                        'repo_url': 'https://github.com/user/repo',
                        'index_id': 'test-index'
                    }),
                    content_type='application/json',
                    headers={'X-User-ID': 'user1', 'Authorization': 'Bearer test-token'}
                )
                
                assert response.status_code == 200
                data = json.loads(response.data)
                assert 'markdown' in data

