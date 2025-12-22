"""LM Studio client implementation"""

import logging
from typing import Optional
import requests

from src.application.interfaces.llm_client import LLMClient
from src.config.settings import settings
from src.domain.models import ContentType

logger = logging.getLogger(__name__)


class LMStudioClient(LLMClient):
    """LM Studio API client implementation"""
    
    def _build_system_prompt(self, content_type: ContentType) -> str:
        """Build system prompt for the model"""
        base_rules = (
            "You are Recall AI Documentation Engine.\n"
            "You convert source material into PROFESSIONAL, STRUCTURED documentation.\n\n"
            "STRICT RULES:\n"
            "- Output MUST be valid markdown\n"
            "- Section numbering is mandatory (1, 1.1, 1.2 …)\n"
            "- Do NOT invent APIs, functions, behavior, or intent\n"
            "- Only describe what exists in the source\n"
            "- Avoid verbosity; prefer bullets\n"
            "- No conversational tone\n"
            "- No emojis\n"
            "- No disclaimers or meta commentary\n"
        )
        
        if content_type == "code":
            return base_rules + (
                "\nDOCUMENT MODE: CODE → DOCUMENTATION\n"
                "Focus on:\n"
                "- Purpose and responsibility\n"
                "- High-level architecture\n"
                "- Modules, functions, classes\n"
                "- Inputs, outputs, side effects\n"
                "- Error handling and edge cases\n"
                "- Strengths, weaknesses, improvements\n"
            )
        
        return base_rules + (
            "\nDOCUMENT MODE: TEXT → DOCUMENTATION\n"
            "Focus on:\n"
            "- Key ideas and hierarchy\n"
            "- Logical structure\n"
            "- Summaries per section\n"
            "- Insights and conclusions\n"
        )
    
    def _build_user_prompt(
        self,
        raw_content: str,
        user_title: Optional[str],
        content_type: ContentType,
    ) -> str:
        """Build user prompt with content"""
        title_line = f"USER_PROVIDED_TITLE: {user_title}\n" if user_title else ""
        
        return (
            f"{title_line}"
            f"CONTENT_TYPE: {content_type}\n\n"
            "Generate documentation using EXACTLY the structure below:\n\n"
            "1. Title\n"
            "2. Table of Contents (numbered, matching headings)\n"
            "3. Overview\n"
            "4. Architecture / Structure\n"
            "5. Detailed Breakdown\n"
            "   - For code: modules, classes, functions\n"
            "   - For text: sections or concepts\n"
            "6. Key Design Decisions or Insights\n"
            "7. Pros and Cons\n"
            "8. Limitations, Edge Cases, or Risks\n"
            "9. Final Review & Recommendations\n\n"
            "Formatting Rules:\n"
            "- Use markdown headings (#, ##, ###)\n"
            "- Use bullet points where applicable\n"
            "- Keep numbering consistent\n\n"
            "SOURCE CONTENT:\n"
            "----------------\n"
            f"{raw_content}\n"
        )
    
    def generate_documentation(
        self,
        content: str,
        content_type: ContentType,
        title: Optional[str] = None,
    ) -> str:
        """Generate documentation using LM Studio API"""
        if not content or not content.strip():
            raise ValueError("content must not be empty")
        
        system_prompt = self._build_system_prompt(content_type)
        user_prompt = self._build_user_prompt(content, title, content_type)
        
        payload = {
            "model": settings.LM_MODEL_NAME,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.15,
            "max_tokens": 1800,
        }
        
        url = f"{settings.LM_STUDIO_BASE_URL}/chat/completions"
        
        try:
            response = requests.post(url, json=payload, timeout=settings.LM_STUDIO_TIMEOUT)
            response.raise_for_status()
        except requests.Timeout:
            logger.error(f"LM Studio request timed out after {settings.LM_STUDIO_TIMEOUT} seconds")
            raise RuntimeError(
                "Request timed out. Please try again or check LM Studio connection."
            ) from None
        except requests.ConnectionError:
            logger.error(f"LM Studio connection failed. Is the server running at {settings.LM_STUDIO_BASE_URL}?")
            raise RuntimeError(
                f"Cannot connect to LM Studio at {settings.LM_STUDIO_BASE_URL}. Please check the server."
            ) from None
        except requests.RequestException as exc:
            logger.exception(f"LM Studio request failed: {exc}")
            raise RuntimeError(f"Failed to generate documentation: {str(exc)}") from exc
        
        try:
            data = response.json()
            content_result = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            logger.exception(f"Unexpected LM Studio response: {response.text}")
            raise RuntimeError("Invalid response structure from LM Studio") from exc
        
        return content_result.strip()

