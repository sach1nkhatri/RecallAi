"""Integration tests for File Upload"""

import pytest
import json
from unittest.mock import patch, Mock, mock_open
from io import BytesIO


class TestFileUpload:
    """Test file upload endpoints"""
    
    def test_upload_files(self, client, mock_mongo):
        """Test POST /api/upload"""
        with patch('src.infrastructure.api.routes.save_uploaded_file') as mock_save:
            mock_save.return_value = 'test-file.py'
            
            data = {
                'file': (BytesIO(b'print("hello")'), 'test.py')
            }
            
            response = client.post(
                '/api/upload',
                data=data,
                content_type='multipart/form-data',
                headers={'X-User-ID': 'user1'}
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert 'success' in data
    
    def test_upload_multiple_files(self, client, mock_mongo):
        """Test uploading multiple files"""
        with patch('src.infrastructure.api.routes.save_uploaded_file') as mock_save:
            mock_save.side_effect = ['file1.py', 'file2.py']
            
            data = {
                'file': [
                    (BytesIO(b'code1'), 'file1.py'),
                    (BytesIO(b'code2'), 'file2.py')
                ]
            }
            
            response = client.post(
                '/api/upload',
                data=data,
                content_type='multipart/form-data',
                headers={'X-User-ID': 'user1'}
            )
            
            assert response.status_code == 200
    
    def test_upload_invalid_file_type(self, client):
        """Test uploading invalid file type"""
        data = {
            'file': (BytesIO(b'content'), 'test.exe')
        }
        
        response = client.post(
            '/api/upload',
            data=data,
            content_type='multipart/form-data'
        )
        
        # Should reject invalid file types
        assert response.status_code in [400, 415]

