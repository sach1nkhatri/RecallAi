"""Integration tests for Bot API routes"""

import pytest
import json
from unittest.mock import patch, Mock, MagicMock


class TestBotRoutes:
    """Test bot API endpoints"""
    
    def test_list_bots(self, client, mock_mongo):
        """Test GET /api/bots"""
        with patch('src.infrastructure.api.bot_routes.bot_service') as mock_service:
            mock_service_instance = MagicMock()
            mock_service_instance.list_bots.return_value = [
                {'id': '1', 'name': 'Test Bot', 'userId': 'user1'}
            ]
            mock_service.return_value = mock_service_instance
            mock_service.list_bots.return_value = [
                {'id': '1', 'name': 'Test Bot', 'userId': 'user1'}
            ]
            
            response = client.get('/api/bots', headers={'X-User-ID': 'user1'})
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert 'bots' in data
            assert len(data['bots']) == 1
    
    def test_create_bot(self, client, mock_mongo):
        """Test POST /api/bots"""
        with patch('src.infrastructure.api.bot_routes.bot_service') as mock_service:
            mock_service.create_bot.return_value = {
                'id': 'new-id',
                'name': 'New Bot',
                'description': 'Test',
                'userId': 'user1'
            }
            
            response = client.post(
                '/api/bots',
                data=json.dumps({
                    'name': 'New Bot',
                    'description': 'Test'
                }),
                content_type='application/json',
                headers={'X-User-ID': 'user1'}
            )
            
            assert response.status_code == 201
            data = json.loads(response.data)
            assert data['bot']['name'] == 'New Bot'
    
    def test_get_bot(self, client, mock_mongo):
        """Test GET /api/bots/<bot_id>"""
        with patch('src.infrastructure.api.bot_routes.bot_service') as mock_service:
            mock_service.get_bot.return_value = {
                'id': '1',
                'name': 'Test Bot',
                'userId': 'user1'
            }
            
            response = client.get('/api/bots/1')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['bot']['id'] == '1'
    
    def test_update_bot(self, client, mock_mongo):
        """Test PUT /api/bots/<bot_id>"""
        with patch('src.infrastructure.api.bot_routes.bot_service') as mock_service:
            mock_service.update_bot.return_value = {
                'id': '1',
                'name': 'Updated Bot',
                'userId': 'user1'
            }
            
            response = client.put(
                '/api/bots/1',
                data=json.dumps({'name': 'Updated Bot'}),
                content_type='application/json'
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['bot']['name'] == 'Updated Bot'
    
    def test_delete_bot(self, client, mock_mongo):
        """Test DELETE /api/bots/<bot_id>"""
        with patch('src.infrastructure.api.bot_routes.bot_service') as mock_service:
            mock_service.delete_bot.return_value = True
            
            response = client.delete('/api/bots/1')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] is True

