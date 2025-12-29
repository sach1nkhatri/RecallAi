"""User service for interacting with Node backend for authentication and usage"""

import logging
import requests
from typing import Optional, Dict, Tuple

from src.config.settings import settings

logger = logging.getLogger(__name__)


class UserService:
    """Service for user authentication and usage management via Node backend"""
    
    def __init__(self, node_backend_url: str = None):
        self.node_backend_url = (node_backend_url or settings.NODE_BACKEND_URL).rstrip("/")
    
    def verify_token(self, token: str) -> Optional[Dict]:
        """
        Verify JWT token with Node backend and get user info.
        
        Args:
            token: JWT token string
            
        Returns:
            User dict with id, email, plan, usage if valid, None otherwise
        """
        if not token:
            return None
        
        try:
            response = requests.get(
                f"{self.node_backend_url}/api/auth/me",
                headers={"Authorization": f"Bearer {token}"},
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user"):
                    return data["user"]
            
            logger.warning(f"Token verification failed: {response.status_code}")
            return None
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to verify token with Node backend: {e}")
            return None
    
    def check_usage_limit(self, token: str, usage_type: str) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Check if user has reached their usage limit.
        
        Args:
            token: JWT token string
            usage_type: Type of usage ('codeToDoc', 'bots', 'chats', 'tokens')
            
        Returns:
            Tuple of (can_proceed, usage_info, error_message)
            - can_proceed: True if user can proceed, False if limit reached
            - usage_info: Current usage information
            - error_message: Error message if limit reached
        """
        if not token:
            # Allow unauthenticated requests for now (backward compatibility)
            return True, None, None
        
        try:
            # Get user info first
            user = self.verify_token(token)
            if not user:
                return False, None, "Invalid authentication token"
            
            # Get usage information
            response = requests.get(
                f"{self.node_backend_url}/api/users/usage",
                headers={"Authorization": f"Bearer {token}"},
                timeout=5
            )
            
            if response.status_code != 200:
                logger.warning(f"Failed to get usage: {response.status_code}")
                return False, None, "Failed to check usage limits"
            
            data = response.json()
            if not data.get("success"):
                return False, None, "Failed to check usage limits"
            
            usage = data.get("usage", {})
            usage_data = usage.get(usage_type, {})
            
            used = usage_data.get("used", 0)
            limit = usage_data.get("limit", 0)
            
            # -1 means unlimited
            if limit == -1:
                return True, usage, None
            
            if used >= limit:
                plan = user.get("plan", "free")
                return False, usage, (
                    f"You have reached your {usage_type} limit ({used}/{limit}). "
                    f"Please upgrade your {plan} plan to continue."
                )
            
            return True, usage, None
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to check usage limit: {e}")
            # Allow request to proceed if Node backend is unavailable (graceful degradation)
            return True, None, None
    
    def increment_usage(self, token: str, usage_type: str, amount: int = 1) -> bool:
        """
        Increment usage counter for a user.
        
        Args:
            token: JWT token string
            usage_type: Type of usage ('codeToDoc', 'bots', 'chats', 'tokens')
            amount: Amount to increment (default: 1)
            
        Returns:
            True if successful, False otherwise
        """
        if not token:
            # Skip incrementing if no token (unauthenticated)
            return True
        
        try:
            response = requests.post(
                f"{self.node_backend_url}/api/users/usage/increment",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                json={"type": usage_type, "amount": amount},
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    logger.info(f"Incremented {usage_type} usage by {amount}")
                    return True
            
            logger.warning(f"Failed to increment usage: {response.status_code}")
            return False
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to increment usage: {e}")
            # Don't fail the request if usage increment fails
            return False

