"""Generation checkpoint storage for resume capability"""

import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict
from bson import ObjectId

from src.infrastructure.storage.database import get_database

logger = logging.getLogger(__name__)


@dataclass
class GenerationCheckpoint:
    """Checkpoint data structure for generation state"""
    repo_id: str
    repo_url: Optional[str] = None
    type: str = "github_repo"  # github_repo, zip_upload, file_upload
    status: str = "pending"  # pending, ingesting, scanning, indexing, generating, merging, completed, failed
    progress: int = 0
    current_step: str = ""
    completed_steps: int = 0
    total_steps: int = 0
    
    # Intermediate results
    ingestion_result: Optional[Dict] = None
    repo_files: Optional[List[Dict]] = None
    chapters: Optional[List[Dict]] = None
    index_path: Optional[str] = None
    index_metadata: Optional[Dict] = None
    generated_markdown: Optional[str] = None
    pdf_path: Optional[str] = None
    pdf_url: Optional[str] = None
    
    # Metadata
    started_at: Optional[datetime] = None
    last_updated: Optional[datetime] = None
    error: Optional[str] = None
    user_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for MongoDB storage"""
        data = asdict(self)
        # Convert datetime to ISO string
        if data.get('started_at'):
            data['started_at'] = data['started_at'].isoformat()
        if data.get('last_updated'):
            data['last_updated'] = data['last_updated'].isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'GenerationCheckpoint':
        """Create from dictionary loaded from MongoDB"""
        # Convert ISO strings back to datetime
        if data.get('started_at'):
            data['started_at'] = datetime.fromisoformat(data['started_at'])
        if data.get('last_updated'):
            data['last_updated'] = datetime.fromisoformat(data['last_updated'])
        return cls(**data)


class CheckpointService:
    """Service for managing generation checkpoints"""
    
    COLLECTION_NAME = "generation_checkpoints"
    
    def __init__(self):
        try:
            self.db = get_database()
            self.collection = self.db[self.COLLECTION_NAME] if self.db is not None else None
        except Exception as e:
            logger.warning(f"MongoDB not available for checkpoints: {e}")
            self.db = None
            self.collection = None
        
        # Create indexes for efficient queries
        if self.collection is not None:
            try:
                self.collection.create_index("repo_id")
                self.collection.create_index("status")
                self.collection.create_index("last_updated")
                self.collection.create_index([("status", 1), ("last_updated", -1)])
            except Exception as e:
                logger.warning(f"Failed to create indexes: {e}")
    
    def save_checkpoint(
        self,
        repo_id: str,
        status: str,
        progress: int,
        current_step: str,
        repo_url: Optional[str] = None,
        type: str = "github_repo",
        completed_steps: int = 0,
        total_steps: int = 0,
        ingestion_result: Optional[Dict] = None,
        repo_files: Optional[List[Dict]] = None,
        chapters: Optional[List[Dict]] = None,
        index_path: Optional[str] = None,
        index_metadata: Optional[Dict] = None,
        generated_markdown: Optional[str] = None,
        pdf_path: Optional[str] = None,
        pdf_url: Optional[str] = None,
        error: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> bool:
        """
        Save or update a generation checkpoint.
        
        Returns:
            True if saved successfully, False otherwise
        """
        if self.collection is None:
            logger.debug("MongoDB not available, skipping checkpoint save")
            return False
        
        try:
            now = datetime.utcnow()
            
            checkpoint_data = {
                "repo_id": repo_id,
                "repo_url": repo_url,
                "type": type,
                "status": status,
                "progress": progress,
                "current_step": current_step,
                "completed_steps": completed_steps,
                "total_steps": total_steps,
                "last_updated": now,
                "error": error,
                "user_id": user_id
            }
            
            # Only update intermediate results if provided (to avoid overwriting with None)
            if ingestion_result is not None:
                checkpoint_data["ingestion_result"] = ingestion_result
            if repo_files is not None:
                checkpoint_data["repo_files"] = repo_files
            if chapters is not None:
                checkpoint_data["chapters"] = chapters
            if index_path is not None:
                checkpoint_data["index_path"] = index_path
            if index_metadata is not None:
                checkpoint_data["index_metadata"] = index_metadata
            if generated_markdown is not None:
                checkpoint_data["generated_markdown"] = generated_markdown
            if pdf_path is not None:
                checkpoint_data["pdf_path"] = pdf_path
            if pdf_url is not None:
                checkpoint_data["pdf_url"] = pdf_url
            
            # Upsert: update if exists, insert if not
            result = self.collection.update_one(
                {"repo_id": repo_id},
                {
                    "$set": checkpoint_data,
                    "$setOnInsert": {"started_at": now}  # Only set on insert
                },
                upsert=True
            )
            
            logger.debug(f"Checkpoint saved for repo_id={repo_id}, status={status}, progress={progress}%")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save checkpoint for repo_id={repo_id}: {e}")
            return False
    
    def get_checkpoint(self, repo_id: str) -> Optional[GenerationCheckpoint]:
        """Get checkpoint for a repository"""
        if self.collection is None:
            return None
        
        try:
            doc = self.collection.find_one({"repo_id": repo_id})
            if doc:
                # Convert ObjectId to string
                doc.pop("_id", None)
                return GenerationCheckpoint.from_dict(doc)
            return None
        except Exception as e:
            logger.error(f"Failed to get checkpoint for repo_id={repo_id}: {e}")
            return None
    
    def get_incomplete_generations(
        self,
        max_age_hours: int = 24,
        limit: int = 10
    ) -> List[GenerationCheckpoint]:
        """
        Get all incomplete generations that can be resumed.
        
        Args:
            max_age_hours: Maximum age in hours for incomplete generations
            limit: Maximum number of checkpoints to return
            
        Returns:
            List of incomplete generation checkpoints
        """
        if self.collection is None:
            return []
        
        try:
            from datetime import timedelta
            cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)
            
            incomplete_statuses = ["pending", "ingesting", "scanning", "indexing", "generating", "merging"]
            
            cursor = self.collection.find({
                "status": {"$in": incomplete_statuses},
                "last_updated": {"$gte": cutoff_time}
            }).sort("last_updated", -1).limit(limit)
            
            checkpoints = []
            for doc in cursor:
                doc.pop("_id", None)
                try:
                    checkpoint = GenerationCheckpoint.from_dict(doc)
                    checkpoints.append(checkpoint)
                except Exception as e:
                    logger.warning(f"Failed to parse checkpoint: {e}")
                    continue
            
            logger.info(f"Found {len(checkpoints)} incomplete generations")
            return checkpoints
            
        except Exception as e:
            logger.error(f"Failed to get incomplete generations: {e}")
            return []
    
    def delete_checkpoint(self, repo_id: str) -> bool:
        """Delete a checkpoint (usually after successful completion)"""
        if self.collection is None:
            return False
        
        try:
            result = self.collection.delete_one({"repo_id": repo_id})
            logger.debug(f"Deleted checkpoint for repo_id={repo_id}")
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Failed to delete checkpoint for repo_id={repo_id}: {e}")
            return False
    
    def mark_completed(self, repo_id: str) -> bool:
        """Mark a checkpoint as completed"""
        if self.collection is None:
            return False
        
        try:
            result = self.collection.update_one(
                {"repo_id": repo_id},
                {
                    "$set": {
                        "status": "completed",
                        "progress": 100,
                        "last_updated": datetime.utcnow()
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to mark checkpoint as completed: {e}")
            return False
    
    def mark_failed(self, repo_id: str, error: str) -> bool:
        """Mark a checkpoint as failed"""
        if self.collection is None:
            return False
        
        try:
            result = self.collection.update_one(
                {"repo_id": repo_id},
                {
                    "$set": {
                        "status": "failed",
                        "error": error,
                        "last_updated": datetime.utcnow()
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to mark checkpoint as failed: {e}")
            return False

