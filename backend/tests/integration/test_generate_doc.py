"""Integration tests for Documentation Generation"""

import pytest
import json
from unittest.mock import patch, Mock


class TestGenerateDocumentation:
    """Test documentation generation endpoints"""
    
    def test_generate_from_files(self, client, mock_mongo, mock_lm_studio):
        """Test POST /api/generate with file uploads"""
        with patch('src.infrastructure.api.routes.user_service') as mock_user:
            mock_user.check_usage_limit.return_value = (True, {}, None)
            mock_user.increment_usage.return_value = True
            
            response = client.post(
                '/api/generate',
                data=json.dumps({
                    'files': ['test.py'],
                    'file_contents': {'test.py': 'print("hello")'}
                }),
                content_type='application/json',
                headers={'X-User-ID': 'user1', 'Authorization': 'Bearer test-token'}
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert 'markdown' in data or 'output' in data
    
    def test_generate_respects_usage_limits(self, client, mock_mongo):
        """Test that generation respects usage limits"""
        with patch('src.infrastructure.api.routes.user_service') as mock_user:
            mock_user.check_usage_limit.return_value = (
                False,
                {'codeToDoc': {'used': 2, 'limit': 2}},
                'Code to Doc limit reached'
            )
            
            response = client.post(
                '/api/generate',
                data=json.dumps({
                    'files': ['test.py'],
                    'file_contents': {'test.py': 'code'}
                }),
                content_type='application/json',
                headers={'X-User-ID': 'user1', 'Authorization': 'Bearer test-token'}
            )
            
            assert response.status_code == 403
            data = json.loads(response.data)
            assert 'limit' in data.get('error', '').lower() or 'limit' in data.get('message', '').lower()

