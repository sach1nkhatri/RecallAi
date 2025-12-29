"""Unit tests for Bot Service"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from src.application.services.bot_service import BotService


class TestBotService:
    """Test BotService class"""
    
    @pytest.fixture
    def bot_service(self):
        """Create BotService instance"""
        with patch('src.application.services.bot_service.BotModel') as mock_model:
            service = BotService()
            service.bot_model = mock_model
            yield service
    
    def test_list_bots(self, bot_service):
        """Test listing bots"""
        mock_bots = [
            {'id': '1', 'name': 'Test Bot', 'userId': 'user1'},
            {'id': '2', 'name': 'Another Bot', 'userId': 'user1'}
        ]
        bot_service.bot_model.find_all.return_value = mock_bots
        
        result = bot_service.list_bots(user_id='user1')
        
        assert len(result) == 2
        assert result[0]['name'] == 'Test Bot'
        bot_service.bot_model.find_all.assert_called_once_with(user_id='user1')
    
    def test_get_bot(self, bot_service):
        """Test getting a single bot"""
        mock_bot = {'id': '1', 'name': 'Test Bot'}
        bot_service.bot_model.find_by_id.return_value = mock_bot
        
        result = bot_service.get_bot('1')
        
        assert result['id'] == '1'
        assert result['name'] == 'Test Bot'
        bot_service.bot_model.find_by_id.assert_called_once_with('1')
    
    def test_create_bot(self, bot_service):
        """Test creating a bot"""
        bot_data = {'name': 'New Bot', 'description': 'Test description'}
        created_bot = {'id': 'new-id', **bot_data}
        bot_service.bot_model.create.return_value = created_bot
        
        result = bot_service.create_bot(bot_data, user_id='user1')
        
        assert 'id' in result
        assert result['name'] == 'New Bot'
        bot_service.bot_model.create.assert_called_once()
    
    def test_update_bot(self, bot_service):
        """Test updating a bot"""
        update_data = {'name': 'Updated Bot'}
        updated_bot = {'id': '1', 'name': 'Updated Bot'}
        bot_service.bot_model.update.return_value = updated_bot
        
        result = bot_service.update_bot('1', update_data)
        
        assert result['name'] == 'Updated Bot'
        bot_service.bot_model.update.assert_called_once_with('1', update_data)
    
    def test_delete_bot(self, bot_service):
        """Test deleting a bot"""
        bot_service.bot_model.delete.return_value = True
        
        result = bot_service.delete_bot('1')
        
        assert result is True
        bot_service.bot_model.delete.assert_called_once_with('1')
    
    def test_update_document_count(self, bot_service):
        """Test updating document count"""
        updated_bot = {'id': '1', 'documentCount': 5}
        bot_service.bot_model.set_document_count.return_value = updated_bot
        
        result = bot_service.update_document_count('1', 5)
        
        assert result['documentCount'] == 5
        bot_service.bot_model.set_document_count.assert_called_once_with('1', 5)

