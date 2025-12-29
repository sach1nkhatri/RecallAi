"""MongoDB database connection"""

import logging
from typing import Optional

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

from src.config.settings import settings

logger = logging.getLogger(__name__)

# Global MongoDB client
_client: Optional[MongoClient] = None
_db = None


def get_client() -> MongoClient:
    """Get or create MongoDB client"""
    global _client
    if _client is None:
        try:
            _client = MongoClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
            )
            # Test connection
            _client.admin.command('ping')
            logger.info(f"MongoDB connected: {settings.MONGODB_URI}")
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise RuntimeError(
                f"Cannot connect to MongoDB at {settings.MONGODB_URI}. "
                "Please ensure MongoDB is running and MONGODB_URI is correct."
            ) from e
    return _client


def get_database():
    """Get database instance"""
    global _db
    if _db is None:
        client = get_client()
        _db = client[settings.MONGODB_DB_NAME]
    return _db


def close_connection():
    """Close MongoDB connection"""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
        logger.info("MongoDB connection closed")

