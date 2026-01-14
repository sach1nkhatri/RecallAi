"""Chat message model for MongoDB"""

from datetime import datetime
from typing import Optional, List

from src.infrastructure.storage.database import get_database


class ChatMessageModel:
    """Chat message model for MongoDB storage"""
    
    COLLECTION_NAME = "chat_messages"
    
    @staticmethod
    def get_collection():
        """Get chat_messages collection"""
        db = get_database()
        return db[ChatMessageModel.COLLECTION_NAME]
    
    @staticmethod
    def create_indexes():
        """Create indexes for better query performance"""
        collection = ChatMessageModel.get_collection()
        # Compound index for faster queries by user and bot
        collection.create_index([("userId", 1), ("botId", 1), ("createdAt", -1)])
        # Index on botId for bot-specific queries
        collection.create_index("botId")
        # Index on userId for user-specific queries
        collection.create_index("userId")
        # Index on createdAt for sorting
        collection.create_index("createdAt")
    
    @staticmethod
    def to_dict(message_doc: dict) -> dict:
        """Convert MongoDB document to dict, handling ObjectId"""
        if message_doc is None:
            return None
        
        result = dict(message_doc)
        # Convert ObjectId to string
        if "_id" in result:
            result["_id"] = str(result["_id"])
        return result
    
    @staticmethod
    def create(user_id: str, bot_id: str, role: str, content: str) -> dict:
        """Create a new chat message"""
        collection = ChatMessageModel.get_collection()
        
        message_data = {
            "userId": user_id,
            "botId": bot_id,
            "role": role,  # "user" or "assistant"
            "content": content,
            "createdAt": datetime.now().isoformat(),
        }
        
        result = collection.insert_one(message_data)
        message_data["_id"] = str(result.inserted_id)
        return ChatMessageModel.to_dict(message_data)
    
    @staticmethod
    def find_by_bot(user_id: str, bot_id: str, limit: Optional[int] = None) -> List[dict]:
        """Find all messages for a specific bot and user"""
        collection = ChatMessageModel.get_collection()
        query = {
            "userId": user_id,
            "botId": bot_id
        }
        
        cursor = collection.find(query).sort("createdAt", 1)  # Oldest first
        
        if limit:
            cursor = cursor.limit(limit)
        
        messages = list(cursor)
        return [ChatMessageModel.to_dict(msg) for msg in messages]
    
    @staticmethod
    def find_recent_by_bot(user_id: str, bot_id: str, limit: int = 50) -> List[dict]:
        """Find recent messages for a specific bot and user (newest first)"""
        collection = ChatMessageModel.get_collection()
        query = {
            "userId": user_id,
            "botId": bot_id
        }
        
        messages = list(
            collection.find(query)
            .sort("createdAt", -1)  # Newest first
            .limit(limit)
        )
        
        # Reverse to get oldest first for display
        messages.reverse()
        return [ChatMessageModel.to_dict(msg) for msg in messages]
    
    @staticmethod
    def delete_by_bot(user_id: str, bot_id: str) -> int:
        """Delete all messages for a specific bot and user"""
        collection = ChatMessageModel.get_collection()
        result = collection.delete_many({
            "userId": user_id,
            "botId": bot_id
        })
        return result.deleted_count
    
    @staticmethod
    def count_by_bot(user_id: str, bot_id: str) -> int:
        """Count messages for a specific bot and user"""
        collection = ChatMessageModel.get_collection()
        return collection.count_documents({
            "userId": user_id,
            "botId": bot_id
        })

