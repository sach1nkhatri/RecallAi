"""Status reporting service to send updates to Node.js backend"""

import logging
import os
from typing import Optional, Dict, Any
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)


class StatusReporter:
    """Reports generation status updates to Node.js backend"""
    
    def __init__(self, node_backend_url: Optional[str] = None):
        """
        Initialize status reporter.
        
        Args:
            node_backend_url: Base URL for Node.js backend (defaults to env var)
        """
        self.node_backend_url = node_backend_url or os.getenv(
            "NODE_BACKEND_URL", 
            "http://localhost:5002"
        )
        
        # Create session with retry strategy
        self.session = requests.Session()
        retry_strategy = Retry(
            total=3,
            backoff_factor=0.3,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["POST"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
    
    def _get_auth_token(self) -> Optional[str]:
        """Get auth token from request context (if available)"""
        # This would need to be passed from the route handler
        # For now, return None - routes will need to pass token
        return None
    
    def update_status(
        self,
        user_id: Optional[str] = None,
        token: Optional[str] = None,
        status_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Update generation status in Node.js backend.
        
        Args:
            user_id: User ID (optional, will try to get from token)
            token: JWT token for authentication (optional)
            status_data: Status update data
            
        Returns:
            True if update succeeded, False otherwise
        """
        if not status_data:
            return False
        
        try:
            headers = {
                "Content-Type": "application/json"
            }
            
            # Add auth token if provided
            if token:
                headers["Authorization"] = f"Bearer {token}"
            
            url = f"{self.node_backend_url}/api/generation-status"
            
            response = self.session.post(
                url,
                json=status_data,
                headers=headers,
                timeout=5  # Short timeout, don't block generation
            )
            
            if response.status_code == 200:
                logger.debug(f"Status update sent successfully: {status_data.get('status')}")
                return True
            elif response.status_code == 401:
                logger.warning("Status update failed: Authentication required")
                return False
            else:
                logger.warning(f"Status update failed: HTTP {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            # Don't log errors - status reporting is optional
            logger.debug(f"Status update failed (non-critical): {e}")
            return False
        except Exception as e:
            logger.debug(f"Status update error (non-critical): {e}")
            return False
    
    def report_progress(
        self,
        status: str,
        progress: int,
        current_step: str,
        token: Optional[str] = None,
        type: str = "github_repo",
        repo_url: Optional[str] = None,
        repo_id: Optional[str] = None,
        repo_info: Optional[Dict] = None,
        file_count: int = 0,
        total_steps: int = 0,
        completed_steps: int = 0,
        estimated_time_remaining: Optional[int] = None
    ) -> bool:
        """
        Report progress update.
        
        Args:
            status: Current status (pending, ingesting, scanning, etc.)
            progress: Progress percentage (0-100)
            current_step: Description of current step
            token: JWT token for authentication
            type: Generation type (github_repo or file_upload)
            repo_url: Repository URL (for github_repo type)
            repo_id: Repository ID (for github_repo type)
            repo_info: Repository info dict
            file_count: Number of files (for file_upload type)
            total_steps: Total number of steps
            completed_steps: Number of completed steps
            estimated_time_remaining: Estimated time remaining in seconds
            
        Returns:
            True if update succeeded, False otherwise
        """
        status_data = {
            "type": type,
            "status": status,
            "progress": progress,
            "currentStep": current_step,
            "totalSteps": total_steps,
            "completedSteps": completed_steps,
            "fileCount": file_count,
            "estimatedTimeRemaining": estimated_time_remaining
        }
        
        if repo_url:
            status_data["repoUrl"] = repo_url
        if repo_id:
            status_data["repoId"] = repo_id
        if repo_info:
            status_data["repoInfo"] = repo_info
        
        return self.update_status(token=token, status_data=status_data)
    
    def report_completion(
        self,
        markdown: str,
        pdf_url: Optional[str] = None,
        pdf_info: Optional[Dict] = None,
        token: Optional[str] = None
    ) -> bool:
        """
        Report generation completion.
        
        Args:
            markdown: Generated markdown content
            pdf_url: URL to generated PDF
            pdf_info: PDF metadata
            token: JWT token for authentication
            
        Returns:
            True if update succeeded, False otherwise
        """
        status_data = {
            "status": "completed",
            "progress": 100,
            "currentStep": "Completed",
            "markdown": markdown,
            "pdfUrl": pdf_url,
            "pdfInfo": pdf_info
        }
        
        return self.update_status(token=token, status_data=status_data)
    
    def report_error(
        self,
        error_message: str,
        error_code: Optional[str] = None,
        token: Optional[str] = None
    ) -> bool:
        """
        Report generation error.
        
        Args:
            error_message: Error message
            error_code: Optional error code
            token: JWT token for authentication
            
        Returns:
            True if update succeeded, False otherwise
        """
        status_data = {
            "status": "failed",
            "error": {
                "message": error_message,
                "code": error_code
            }
        }
        
        return self.update_status(token=token, status_data=status_data)

