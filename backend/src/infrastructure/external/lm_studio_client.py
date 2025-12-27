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
            "You are Recall AI Documentation Engine - an expert technical writer and code analyst.\n"
            "You convert source material into PROFESSIONAL, COMPREHENSIVE, and STRUCTURED documentation.\n\n"
            "STRICT RULES:\n"
            "- Output MUST be valid markdown\n"
            "- Use clear hierarchical structure with numbered sections\n"
            "- Be thorough but concise\n"
            "- Do NOT invent or assume anything not in the source\n"
            "- Only document what actually exists\n"
            "- Use code blocks for code examples\n"
            "- Include practical examples where relevant\n"
            "- No conversational tone - be professional and direct\n"
            "- No emojis or decorative elements\n"
            "- No meta commentary about the documentation process\n"
        )
        
        if content_type == "code":
            return base_rules + (
                "\nDOCUMENT MODE: CODE → DOCUMENTATION\n"
                "Your task is to analyze code and create comprehensive technical documentation.\n\n"
                "ANALYSIS APPROACH:\n"
                "1. Identify the overall purpose and architecture\n"
                "2. Document all modules, classes, and functions with:\n"
                "   - Clear descriptions of purpose\n"
                "   - Parameters and return types\n"
                "   - Dependencies and relationships\n"
                "   - Usage examples where helpful\n"
                "3. Identify patterns, design decisions, and architecture\n"
                "4. Note error handling, edge cases, and potential issues\n"
                "5. Provide insights on code quality and improvements\n\n"
                "OUTPUT STRUCTURE:\n"
                "- Start with a clear title and overview\n"
                "- Include architecture/design section\n"
                "- Document all major components systematically\n"
                "- Include usage examples and best practices\n"
                "- Note any limitations or considerations\n"
            )
        
        return base_rules + (
            "\nDOCUMENT MODE: TEXT/DATA → DOCUMENTATION\n"
            "Your task is to transform text or data content into well-structured documentation.\n\n"
            "PROCESSING APPROACH:\n"
            "1. Identify content type (text, JSON, database records, configuration, etc.)\n"
            "2. For data structures: analyze schema, fields, relationships, and patterns\n"
            "3. For text: identify main themes and concepts\n"
            "4. Organize information hierarchically\n"
            "5. Create clear sections with logical flow\n"
            "6. Extract key insights and conclusions\n"
            "7. Maintain original meaning while improving clarity\n\n"
            "OUTPUT STRUCTURE:\n"
            "- Clear title and executive summary\n"
            "- For data: schema documentation with field descriptions\n"
            "- For text: organized sections with headings\n"
            "- Key points highlighted\n"
            "- Conclusions and takeaways\n"
            "- Use tables for structured data when appropriate\n"
        )
    
    def _detect_content_structure(self, content: str) -> dict:
        """Detect content structure and type for better processing"""
        content_lower = content.lower()
        structure_info = {
            "has_json": "{" in content and "}" in content,
            "has_code": any(keyword in content_lower for keyword in ["function", "class", "def ", "import ", "export ", "const ", "let ", "var "]),
            "has_data": any(keyword in content_lower for keyword in ["_id", "email", "password", "createdat", "updatedat"]),
            "is_database": any(keyword in content_lower for keyword in ["mongodb", "collection", "document", "$oid", "$date"]),
            "is_config": any(keyword in content_lower for keyword in ["config", "settings", "env", "environment"]),
        }
        return structure_info
    
    def _build_user_prompt(
        self,
        raw_content: str,
        user_title: Optional[str],
        content_type: ContentType,
        file_count: Optional[int] = None,
    ) -> str:
        """Build user prompt with content"""
        title_line = f"USER_PROVIDED_TITLE: {user_title}\n" if user_title else ""
        file_info = f"FILES_PROCESSED: {file_count} file(s)\n" if file_count else ""
        
        # Detect content structure for better analysis
        structure = self._detect_content_structure(raw_content)
        structure_hints = []
        if structure["has_json"]:
            structure_hints.append("The content contains JSON data structures")
        if structure["is_database"]:
            structure_hints.append("The content appears to be database records or MongoDB documents")
        if structure["has_data"]:
            structure_hints.append("The content contains data records with fields like email, password, dates")
        if structure["is_config"]:
            structure_hints.append("The content appears to be configuration data")
        
        structure_context = "\n".join(f"- {hint}" for hint in structure_hints) if structure_hints else ""
        structure_section = f"\nCONTENT_ANALYSIS:\n{structure_context}\n" if structure_context else ""
        
        if content_type == "code":
            return (
                f"{title_line}"
                f"{file_info}"
                f"CONTENT_TYPE: Code\n\n"
                "Analyze the following code and generate comprehensive technical documentation.\n\n"
                "REQUIRED DOCUMENTATION STRUCTURE:\n\n"
                "1. **Title** (use provided title or generate appropriate one)\n"
                "2. **Table of Contents** (auto-generated, numbered)\n"
                "3. **Overview**\n"
                "   - Purpose and scope\n"
                "   - High-level description\n"
                "   - Key technologies/frameworks used\n\n"
                "4. **Architecture & Design**\n"
                "   - Overall structure\n"
                "   - Design patterns used\n"
                "   - Component relationships\n"
                "   - Data flow (if applicable)\n\n"
                "5. **Components & Modules**\n"
                "   - Document each major component:\n"
                "     * Classes: purpose, properties, methods\n"
                "     * Functions: parameters, return values, behavior\n"
                "     * Modules: responsibilities and exports\n"
                "   - Include code examples where helpful\n"
                "   - Note dependencies between components\n\n"
                "6. **Usage & Examples**\n"
                "   - How to use the code\n"
                "   - Practical examples\n"
                "   - Common use cases\n\n"
                "7. **Technical Details**\n"
                "   - Error handling approach\n"
                "   - Edge cases and considerations\n"
                "   - Performance characteristics (if relevant)\n\n"
                "8. **Summary & Notes**\n"
                "   - Key takeaways\n"
                "   - Potential improvements\n"
                "   - Important considerations\n\n"
                "FORMATTING:\n"
                "- Use proper markdown syntax\n"
                "- Code blocks with language tags\n"
                "- Clear headings hierarchy (#, ##, ###)\n"
                "- Bullet points for lists\n"
                "- Bold for emphasis\n\n"
                "SOURCE CODE:\n"
                "============\n"
                f"{raw_content}\n"
            )
        
        # Special handling for JSON/data structures
        if structure["has_json"] or structure["is_database"] or structure["has_data"]:
            return (
                f"{title_line}"
                f"{file_info}"
                f"{structure_section}"
                f"CONTENT_TYPE: Data/JSON Documentation\n\n"
                "Analyze the following data structure and generate comprehensive documentation.\n\n"
                "REQUIRED DOCUMENTATION STRUCTURE:\n\n"
                "1. **Title** (use provided title or generate descriptive title like 'User Data Schema Documentation')\n"
                "2. **Table of Contents** (auto-generated)\n"
                "3. **Overview**\n"
                "   - Purpose of the data structure\n"
                "   - Type of data (database records, configuration, API response, etc.)\n"
                "   - Scope and context\n\n"
                "4. **Data Schema**\n"
                "   - Document each field with:\n"
                "     * Field name and type\n"
                "     * Purpose and description\n"
                "     * Constraints or validation rules\n"
                "     * Example values\n"
                "   - Required vs optional fields\n"
                "   - Relationships between fields\n\n"
                "5. **Data Structure Analysis**\n"
                "   - Overall structure pattern\n"
                "   - Nested objects or arrays\n"
                "   - Special fields (IDs, timestamps, references)\n"
                "   - Data types and formats\n\n"
                "6. **Usage & Examples**\n"
                "   - How the data is used\n"
                "   - Example records with explanations\n"
                "   - Common operations\n\n"
                "7. **Technical Details**\n"
                "   - Database/collection information (if applicable)\n"
                "   - Indexing considerations\n"
                "   - Data validation rules\n"
                "   - Security considerations (especially for sensitive fields)\n\n"
                "8. **Summary**\n"
                "   - Key insights about the data structure\n"
                "   - Important notes\n"
                "   - Recommendations\n\n"
                "FORMATTING:\n"
                "- Use proper markdown syntax\n"
                "- Code blocks with 'json' language tag for examples\n"
                "- Tables for field documentation\n"
                "- Clear headings hierarchy\n"
                "- Bold for field names and important terms\n\n"
                "SOURCE DATA:\n"
                "============\n"
                f"{raw_content}\n"
            )
        
        return (
            f"{title_line}"
            f"{file_info}"
            f"{structure_section}"
            f"CONTENT_TYPE: Text\n\n"
            "Transform the following text content into well-structured documentation.\n\n"
            "REQUIRED DOCUMENTATION STRUCTURE:\n\n"
            "1. **Title** (use provided title or generate from content)\n"
            "2. **Table of Contents** (auto-generated)\n"
            "3. **Executive Summary**\n"
            "   - Main purpose and scope\n"
            "   - Key points overview\n\n"
            "4. **Main Content**\n"
            "   - Organize into logical sections\n"
            "   - Use clear headings\n"
            "   - Maintain original meaning\n"
            "   - Improve clarity and flow\n\n"
            "5. **Key Concepts**\n"
            "   - Important ideas highlighted\n"
            "   - Relationships between concepts\n"
            "   - Supporting details\n\n"
            "6. **Insights & Analysis**\n"
            "   - Patterns identified\n"
            "   - Important conclusions\n"
            "   - Practical implications\n\n"
            "7. **Summary**\n"
            "   - Main takeaways\n"
            "   - Action items (if applicable)\n"
            "   - Related topics\n\n"
            "FORMATTING:\n"
            "- Use proper markdown syntax\n"
            "- Clear headings hierarchy\n"
            "- Bullet points for lists\n"
            "- Bold for key terms\n"
            "- Code blocks for technical terms if needed\n\n"
            "SOURCE TEXT:\n"
            "============\n"
            f"{raw_content}\n"
        )
    
    def generate_documentation(
        self,
        content: str,
        content_type: ContentType,
        title: Optional[str] = None,
        file_count: Optional[int] = None,
    ) -> str:
        """Generate documentation using LM Studio API"""
        if not content or not content.strip():
            raise ValueError("content must not be empty")
        
        system_prompt = self._build_system_prompt(content_type)
        user_prompt = self._build_user_prompt(content, title, content_type, file_count)
        
        # Log what we're sending
        logger.info(
            f"Generating documentation | content_length={len(content)} | "
            f"prompt_length={len(user_prompt)} | type={content_type} | files={file_count or 'direct'}"
        )
        
        # Adjust tokens based on content length - scale better for larger content
        content_length = len(content)
        # Estimate: 1 token ≈ 4 characters, so scale output tokens with input
        if content_length > 50000:
            max_tokens = 8000  # Large documents need comprehensive output
        elif content_length > 20000:
            max_tokens = 6000
        elif content_length > 10000:
            max_tokens = 5000
        elif content_length > 5000:
            max_tokens = 4000
        elif content_length > 2000:
            max_tokens = 3000
        else:
            max_tokens = 2500
        
        logger.info(f"Allocated {max_tokens} max_tokens for generation")
        
        # Adjust temperature based on content type
        # Lower for structured data, slightly higher for creative text
        temp = 0.15 if content_type == "code" else 0.2
        
        payload = {
            "model": settings.LM_MODEL_NAME,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temp,
            "max_tokens": max_tokens,
            "top_p": 0.9,
            "frequency_penalty": 0.1,
            "presence_penalty": 0.1,
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
            
            # Handle different response structures
            if "choices" in data and len(data["choices"]) > 0:
                content_result = data["choices"][0]["message"]["content"]
            elif "content" in data:
                content_result = data["content"]
            elif "text" in data:
                content_result = data["text"]
            else:
                logger.error(f"Unexpected response structure: {data}")
                raise RuntimeError("Invalid response structure from LM Studio")
            
            # Clean and validate the response
            if not content_result or not content_result.strip():
                logger.warning("Empty response from LM Studio")
                raise RuntimeError("Received empty response from LM Studio")
            
            result = content_result.strip()
            
            # Ensure minimum quality - if response is too short, it might be an error
            if len(result) < 100:
                logger.warning(f"Response too short ({len(result)} chars), might be incomplete")
            
            return result
            
        except (KeyError, IndexError, TypeError) as exc:
            logger.exception(f"Unexpected LM Studio response: {response.text}")
            raise RuntimeError("Invalid response structure from LM Studio") from exc

