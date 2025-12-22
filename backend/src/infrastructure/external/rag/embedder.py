"""LM Studio embedding client for RAG"""

import os
import time
import logging
from typing import List

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)


class LMStudioEmbedder:
    """LM Studio embedding client with retry logic"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.model = os.getenv("LM_STUDIO_EMBED_MODEL", "Qwen3-Embedding-0.6B-GGUF")
        
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

    def _check_connection(self) -> bool:
        """Check if LM Studio is reachable."""
        try:
            resp = self.session.get(f"{self.base_url}/v1/models", timeout=5)
            return resp.status_code == 200
        except Exception as e:
            logger.warning(f"LM Studio connection check failed: {e}")
            return False

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
            
            payload = {
                "model": self.model,
                "input": text,
            }
            
            max_retries = 3
            last_error = None
            
            for attempt in range(max_retries):
                try:
                    resp = self.session.post(
                        f"{self.base_url}/v1/embeddings",
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
                    raise RuntimeError(
                        f"Embedding request failed: {error_msg}. "
                        f"Model '{self.model}' may not be loaded in LM Studio. "
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

