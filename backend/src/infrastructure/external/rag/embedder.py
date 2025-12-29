"""LM Studio embedding client for RAG"""

import os
import time
import logging
from typing import List

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from src.config.settings import settings

logger = logging.getLogger(__name__)


class LMStudioEmbedder:
    """LM Studio embedding client with retry logic"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.model = None  # Will be auto-detected
        
        # Create session with retry strategy
        self.session = requests.Session()
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["POST"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Auto-detect embedding model
        self._detect_embedding_model()

    def _check_connection(self) -> bool:
        """Check if LM Studio is reachable using /v1/models endpoint."""
        try:
            resp = self.session.get(f"{self.base_url}/models", timeout=5)
            return resp.status_code == 200
        except Exception as e:
            logger.warning(f"LM Studio connection check failed: {e}")
            return False

    def _detect_embedding_model(self) -> None:
        """Auto-detect available embedding model from LM Studio."""
        # First check if user specified a model via env var
        env_model = os.getenv("LM_STUDIO_EMBED_MODEL")
        if env_model:
            self.model = env_model
            logger.info(f"Using embedding model from env: {self.model}")
            return
        
        # Use default from settings if available
        if hasattr(settings, 'LM_STUDIO_EMBED_MODEL') and settings.LM_STUDIO_EMBED_MODEL:
            self.model = settings.LM_STUDIO_EMBED_MODEL
            logger.info(f"Using embedding model from settings: {self.model}")
            return
        
        # Try to auto-detect from LM Studio
        try:
            resp = self.session.get(f"{self.base_url}/models", timeout=5)
            if resp.status_code == 200:
                models_data = resp.json()
                models = models_data.get("data", [])
                
                # Look for embedding models (they typically have "embed" in the name or id)
                embedding_models = [
                    model for model in models
                    if "embed" in model.get("id", "").lower() or 
                       "embedding" in model.get("id", "").lower()
                ]
                
                if embedding_models:
                    # Use the first available embedding model
                    self.model = embedding_models[0].get("id")
                    logger.info(f"Auto-detected embedding model: {self.model}")
                elif models:
                    # If no embedding models found, try using the first available model
                    # LM Studio might have embedding capability even if not explicitly named
                    self.model = models[0].get("id")
                    logger.info(f"No explicit embedding models found, using first available model: {self.model}")
                else:
                    logger.info("No models found in LM Studio, will try without specifying model (LM Studio will auto-select)")
                    self.model = None
            else:
                logger.warning(f"Failed to fetch models from LM Studio: HTTP {resp.status_code}")
                self.model = None
        except Exception as e:
            logger.warning(f"Failed to auto-detect embedding model: {e}. Will try without specifying model.")
            self.model = None

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Embed texts with retry logic and better error handling."""
        if not texts:
            return []
        
        # Check connection first
        if not self._check_connection():
            raise RuntimeError(
                f"Cannot connect to LM Studio at {self.base_url}. "
                "Please ensure LM Studio is running and the embedding model is loaded. "
                "Check the Developer tab in LM Studio and ensure the server is started."
            )
        
        embeddings: List[List[float]] = []
        for idx, text in enumerate(texts):
            if not text.strip():
                continue
            
            # Build payload - only include model if we have one
            payload = {
                "input": text,
            }
            # Only add model if we detected one (LM Studio can auto-select if not specified)
            if self.model:
                payload["model"] = self.model
            
            max_retries = 3
            last_error = None
            
            for attempt in range(max_retries):
                try:
                    # base_url already includes /v1, so just use /embeddings
                    resp = self.session.post(
                        f"{self.base_url}/embeddings",
                        json=payload,
                        timeout=60
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    
                    if "data" not in data or not data["data"]:
                        raise ValueError(f"Invalid response from LM Studio: {data}")
                    
                    vector = data["data"][0]["embedding"]
                    embeddings.append(vector)
                    last_error = None
                    break
                    
                except requests.exceptions.Timeout as e:
                    last_error = f"Timeout connecting to LM Studio (attempt {attempt + 1}/{max_retries})"
                    logger.warning(f"{last_error}: {e}")
                    if attempt < max_retries - 1:
                        time.sleep(2 ** attempt)  # Exponential backoff
                    else:
                        raise RuntimeError(
                            f"Failed to get embeddings after {max_retries} attempts. "
                            f"LM Studio at {self.base_url} is not responding. "
                            "Please check that LM Studio is running and the embedding model is loaded."
                        ) from e
                        
                except requests.exceptions.ConnectionError as e:
                    last_error = f"Connection error to LM Studio (attempt {attempt + 1}/{max_retries})"
                    logger.warning(f"{last_error}: {e}")
                    if attempt < max_retries - 1:
                        time.sleep(2 ** attempt)
                    else:
                        raise RuntimeError(
                            f"Cannot connect to LM Studio at {self.base_url}. "
                            "Please ensure LM Studio server is running and accessible. "
                            "Check your network connection and LM Studio settings."
                        ) from e
                        
                except requests.HTTPError as e:
                    error_msg = f"HTTP {resp.status_code}" if 'resp' in locals() else "HTTP error"
                    model_info = f"Model '{self.model}' " if self.model else ""
                    raise RuntimeError(
                        f"Embedding request failed: {error_msg}. "
                        f"{model_info}Please ensure an embedding model is loaded in LM Studio. "
                        f"Response: {getattr(resp, 'text', str(e))}"
                    ) from e
                    
                except Exception as e:
                    last_error = f"Unexpected error (attempt {attempt + 1}/{max_retries}): {str(e)}"
                    logger.error(last_error)
                    if attempt < max_retries - 1:
                        time.sleep(2 ** attempt)
                    else:
                        raise RuntimeError(
                            f"Failed to generate embeddings: {str(e)}. "
                            "Please check LM Studio logs and ensure the embedding model is properly loaded."
                        ) from e
            
            if last_error:
                raise RuntimeError(last_error)
        
        return embeddings

