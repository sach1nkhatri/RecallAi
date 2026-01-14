"""Status history storage for tracking system health over time"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pymongo import MongoClient

from src.infrastructure.storage.database import get_database

logger = logging.getLogger(__name__)

COLLECTION_NAME = "status_history"


class StatusHistory:
    """Store and retrieve status check history"""
    
    _collection_initialized = False
    
    @staticmethod
    def get_collection():
        """Get status history collection"""
        db = get_database()
        collection = db[COLLECTION_NAME]
        
        # Create indexes for better performance (only once)
        if not StatusHistory._collection_initialized:
            try:
                collection.create_index([("service", 1), ("timestamp", -1)])
                collection.create_index([("timestamp", -1)])  # For cleanup operations
                StatusHistory._collection_initialized = True
                logger.info("Status history collection indexes created")
            except Exception as e:
                logger.warning(f"Failed to create indexes: {e}")
        
        return collection
    
    @staticmethod
    def record_status_check(service_name: str, status: str, details: Dict[str, Any] = None):
        """Record a status check for a service"""
        try:
            collection = StatusHistory.get_collection()
            
            record = {
                "service": service_name,
                "status": status,  # 'healthy', 'unhealthy', 'error'
                "timestamp": datetime.utcnow(),
                "details": details or {}
            }
            
            collection.insert_one(record)
            logger.debug(f"Recorded status check: {service_name} = {status}")
        except Exception as e:
            logger.warning(f"Failed to record status check: {e}")
    
    @staticmethod
    def get_recent_statuses(service_name: str, days: int = 30) -> List[Dict[str, Any]]:
        """Get recent status checks for a service"""
        try:
            collection = StatusHistory.get_collection()
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            records = list(collection.find(
                {
                    "service": service_name,
                    "timestamp": {"$gte": cutoff_date}
                }
            ).sort("timestamp", 1))  # Sort ascending by timestamp
            
            # Convert ObjectId to string and datetime to ISO format
            for record in records:
                record["_id"] = str(record["_id"])
                if isinstance(record.get("timestamp"), datetime):
                    record["timestamp"] = record["timestamp"].isoformat()
            
            return records
        except Exception as e:
            logger.warning(f"Failed to get recent statuses: {e}")
            return []
    
    @staticmethod
    def get_daily_status_summary(service_name: str, days: int = 30) -> List[Dict[str, Any]]:
        """Get daily status summary (one record per day)"""
        try:
            collection = StatusHistory.get_collection()
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            # Aggregate by day
            pipeline = [
                {
                    "$match": {
                        "service": service_name,
                        "timestamp": {"$gte": cutoff_date}
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": "$timestamp"
                            }
                        },
                        "checks": {"$push": "$$ROOT"},
                        "total_checks": {"$sum": 1},
                        "healthy_count": {
                            "$sum": {
                                "$cond": [{"$eq": ["$status", "healthy"]}, 1, 0]
                            }
                        },
                        "unhealthy_count": {
                            "$sum": {
                                "$cond": [{"$eq": ["$status", "unhealthy"]}, 1, 0]
                            }
                        },
                        "error_count": {
                            "$sum": {
                                "$cond": [{"$eq": ["$status", "error"]}, 1, 0]
                            }
                        }
                    }
                },
                {
                    "$sort": {"_id": 1}
                }
            ]
            
            results = list(collection.aggregate(pipeline))
            
            # Format results
            daily_summaries = []
            for result in results:
                total = result["total_checks"]
                healthy = result["healthy_count"]
                unhealthy = result["unhealthy_count"]
                error = result["error_count"]
                
                # Determine day status based on majority
                if error > total * 0.1:  # More than 10% errors = red
                    day_status = "red"
                elif unhealthy > total * 0.1:  # More than 10% unhealthy = yellow
                    day_status = "yellow"
                else:  # Mostly healthy = green
                    day_status = "green"
                
                daily_summaries.append({
                    "date": result["_id"],
                    "status": day_status,
                    "healthy_count": healthy,
                    "unhealthy_count": unhealthy,
                    "error_count": error,
                    "total_checks": total,
                    "uptime_percentage": round((healthy / total * 100) if total > 0 else 100, 2)
                })
            
            return daily_summaries
        except Exception as e:
            logger.warning(f"Failed to get daily status summary: {e}")
            return []
    
    @staticmethod
    def calculate_uptime_percentage(service_name: str, days: int = 30) -> float:
        """Calculate uptime percentage from historical data"""
        try:
            collection = StatusHistory.get_collection()
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            # Count total checks and healthy checks
            total = collection.count_documents({
                "service": service_name,
                "timestamp": {"$gte": cutoff_date}
            })
            
            if total == 0:
                return 100.0  # No data = assume 100% uptime
            
            healthy = collection.count_documents({
                "service": service_name,
                "status": "healthy",
                "timestamp": {"$gte": cutoff_date}
            })
            
            return round((healthy / total * 100), 2)
        except Exception as e:
            logger.warning(f"Failed to calculate uptime percentage: {e}")
            return 100.0  # Default to 100% on error
    
    @staticmethod
    def get_uptime_bars(service_name: str, days: int = 30) -> List[str]:
        """Get uptime bars for visualization (one per day)"""
        try:
            daily_summaries = StatusHistory.get_daily_status_summary(service_name, days)
            
            # If we have less than 30 days, pad with green (assume healthy)
            bars = [day["status"] for day in daily_summaries]
            
            # Pad to 30 days if needed
            while len(bars) < days:
                bars.insert(0, "green")  # Add green bars at the beginning
            
            # Take last 30 days
            return bars[-days:]
        except Exception as e:
            logger.warning(f"Failed to get uptime bars: {e}")
            # Return all green if error
            return ["green"] * days
    
    @staticmethod
    def cleanup_old_records(days_to_keep: int = 90):
        """Remove status records older than specified days"""
        try:
            collection = StatusHistory.get_collection()
            cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
            
            result = collection.delete_many({
                "timestamp": {"$lt": cutoff_date}
            })
            
            logger.info(f"Cleaned up {result.deleted_count} old status records")
            return result.deleted_count
        except Exception as e:
            logger.warning(f"Failed to cleanup old records: {e}")
            return 0

