"""Bot model for MongoDB"""

from datetime import datetime
from typing import Optional

from src.infrastructure.storage.database import get_database


class BotModel:
    """Bot model for MongoDB storage"""
    
    COLLECTION_NAME = "bots"
    
    @staticmethod
    def get_collection():
        """Get bots collection"""
        db = get_database()
        return db[BotModel.COLLECTION_NAME]
    
    @staticmethod
    def create_indexes():
        """Create indexes for better query performance"""
        collection = BotModel.get_collection()
        # Index on userId for faster user queries
        collection.create_index("userId")
        # Index on id for faster lookups
        collection.create_index("id", unique=True)
        # Index on createdAt for sorting
        collection.create_index("createdAt")
    
    @staticmethod
    def to_dict(bot_doc: dict) -> dict:
        """Convert MongoDB document to dict, handling ObjectId"""
        if bot_doc is None:
            return None
        
        result = dict(bot_doc)
        # Convert ObjectId to string
        if "_id" in result:
            result["_id"] = str(result["_id"])
        return result
    
    @staticmethod
    def find_all(user_id: Optional[str] = None) -> list[dict]:
        """Find all bots, optionally filtered by user_id"""
        collection = BotModel.get_collection()
        query = {}
        if user_id:
            query["userId"] = user_id
        
        bots = list(collection.find(query).sort("createdAt", -1))
        return [BotModel.to_dict(bot) for bot in bots]
    
    @staticmethod
    def find_by_id(bot_id: str) -> Optional[dict]:
        """Find bot by ID"""
        collection = BotModel.get_collection()
        bot = collection.find_one({"id": bot_id})
        return BotModel.to_dict(bot)
    
    @staticmethod
    def create(bot_data: dict) -> dict:
        """Create a new bot"""
        collection = BotModel.get_collection()
        
        # Ensure createdAt is set
        if "createdAt" not in bot_data:
            bot_data["createdAt"] = datetime.now().isoformat()
        
        # Ensure updatedAt is set
        if "updatedAt" not in bot_data:
            bot_data["updatedAt"] = datetime.now().isoformat()
        
        result = collection.insert_one(bot_data)
        bot_data["_id"] = str(result.inserted_id)
        return BotModel.to_dict(bot_data)
    
    @staticmethod
    def update(bot_id: str, update_data: dict) -> Optional[dict]:
        """Update a bot"""
        collection = BotModel.get_collection()
        
        # Add updatedAt timestamp
        update_data["updatedAt"] = datetime.now().isoformat()
        
        result = collection.find_one_and_update(
            {"id": bot_id},
            {"$set": update_data},
            return_document=True
        )
        
        if result is None:
            return None
        
        return BotModel.to_dict(result)
    
    @staticmethod
    def delete(bot_id: str) -> bool:
        """Delete a bot"""
        collection = BotModel.get_collection()
        result = collection.delete_one({"id": bot_id})
        return result.deleted_count > 0
    
    @staticmethod
    def increment_document_count(bot_id: str, count: int = 1) -> Optional[dict]:
        """Increment document count for a bot"""
        collection = BotModel.get_collection()
        result = collection.find_one_and_update(
            {"id": bot_id},
            {
                "$inc": {"documentCount": count},
                "$set": {"updatedAt": datetime.now().isoformat()}
            },
            return_document=True
        )
        
        if result is None:
            return None
        
        return BotModel.to_dict(result)
    
    @staticmethod
    def set_document_count(bot_id: str, count: int) -> Optional[dict]:
        """Set document count for a bot"""
        collection = BotModel.get_collection()
        result = collection.find_one_and_update(
            {"id": bot_id},
            {
                "$set": {
                    "documentCount": count,
                    "updatedAt": datetime.now().isoformat()
                }
            },
            return_document=True
        )
        
        if result is None:
            return None
        
        return BotModel.to_dict(result)

