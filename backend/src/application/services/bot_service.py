"""Bot service layer for business logic"""

import logging
import uuid
from datetime import datetime
from typing import Optional

from src.infrastructure.storage.bot_model import BotModel

logger = logging.getLogger(__name__)


class BotService:
    """Service for bot management operations"""
    
    def __init__(self):
        """Initialize bot service"""
        # Ensure indexes are created
        try:
            BotModel.create_indexes()
        except Exception as e:
            logger.warning(f"Failed to create bot indexes: {e}")
    
    def list_bots(self, user_id: Optional[str] = None) -> list[dict]:
        """List all bots, optionally filtered by user"""
        try:
            return BotModel.find_all(user_id=user_id)
        except Exception as e:
            logger.exception("Failed to list bots")
            raise
    
    def get_bot(self, bot_id: str) -> Optional[dict]:
        """Get a bot by ID"""
        try:
            return BotModel.find_by_id(bot_id)
        except Exception as e:
            logger.exception(f"Failed to get bot {bot_id}")
            raise
    
    def create_bot(self, bot_data: dict, user_id: Optional[str] = None) -> dict:
        """Create a new bot"""
        try:
            # Generate bot ID if not provided
            if "id" not in bot_data:
                bot_data["id"] = str(uuid.uuid4())
            
            # Set defaults
            bot_data.setdefault("name", "Unnamed Bot")
            bot_data.setdefault("description", "")
            bot_data.setdefault("systemPrompt", "")
            bot_data.setdefault("temperature", 0.7)
            bot_data.setdefault("topK", 5)
            bot_data.setdefault("documentCount", 0)
            
            # Add user ID if provided
            if user_id:
                bot_data["userId"] = user_id
            
            return BotModel.create(bot_data)
        except Exception as e:
            logger.exception("Failed to create bot")
            raise
    
    def update_bot(self, bot_id: str, update_data: dict) -> Optional[dict]:
        """Update a bot"""
        try:
            # Only allow updating specific fields
            allowed_fields = ["name", "description", "systemPrompt", "temperature", "topK"]
            filtered_data = {
                k: v for k, v in update_data.items()
                if k in allowed_fields
            }
            
            if not filtered_data:
                # Return existing bot if no valid updates
                return self.get_bot(bot_id)
            
            return BotModel.update(bot_id, filtered_data)
        except Exception as e:
            logger.exception(f"Failed to update bot {bot_id}")
            raise
    
    def delete_bot(self, bot_id: str) -> bool:
        """Delete a bot"""
        try:
            return BotModel.delete(bot_id)
        except Exception as e:
            logger.exception(f"Failed to delete bot {bot_id}")
            raise
    
    def update_document_count(self, bot_id: str, count: int) -> Optional[dict]:
        """Update document count for a bot"""
        try:
            return BotModel.set_document_count(bot_id, count)
        except Exception as e:
            logger.exception(f"Failed to update document count for bot {bot_id}")
            raise

