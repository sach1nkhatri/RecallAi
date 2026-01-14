"""LM Studio client implementation"""

import logging
import re
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
            "- CRITICAL: Output ONLY the final documentation content\n"
            "- Do NOT include your thinking process, reasoning steps, or internal analysis\n"
            "- Do NOT include phrases like 'Okay, I need to...', 'Let me...', 'First, looking at...', 'Wait, the user...', etc.\n"
            "- Start directly with the documentation title/heading - no preamble\n"
            "- Output should be clean, publication-ready documentation\n"
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
                "Analyze the following code and generate comprehensive technical documentation.\n"
                "IMPORTANT: Output ONLY the final documentation. Do NOT include your thinking process, reasoning steps, or any meta-commentary.\n"
                "Start directly with the documentation title/heading. Do NOT include text like 'Okay, I need to...', 'Let me...', 'First, looking at...', etc.\n\n"
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
                "Analyze the following data structure and generate comprehensive documentation.\n"
                "CRITICAL: Output ONLY the final documentation. Do NOT include your thinking process, reasoning steps, or any meta-commentary.\n"
                "Start directly with the documentation title/heading. Do NOT include phrases like 'Okay, I need to...', 'Let me...', 'First, looking at...', 'Wait, the user...', etc.\n\n"
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
            "Transform the following text content into well-structured documentation.\n"
            "CRITICAL: Output ONLY the final documentation. Do NOT include your thinking process, reasoning, or any meta-commentary.\n"
            "Start directly with the documentation title/heading. Do NOT include phrases like 'Okay, I need to...', 'Let me...', 'First, looking at...', etc.\n\n"
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
        timeout: Optional[int] = None,
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
        
        # Remove trailing /v1 if present, then add /chat/completions
        base = settings.LM_STUDIO_BASE_URL.rstrip('/').rstrip('/v1')
        url = f"{base}/v1/chat/completions"
        
        logger.info(f"Using chat model: {settings.LM_MODEL_NAME} for endpoint: {url}")
        
        # Use custom timeout if provided, otherwise use default
        request_timeout = timeout if timeout is not None else settings.LM_STUDIO_TIMEOUT
        
        try:
            # Log the request details for debugging
            logger.debug(f"LM Studio request: url={url}, model={settings.LM_MODEL_NAME}, payload_size={len(str(payload))}")
            response = requests.post(url, json=payload, timeout=request_timeout)
            response.raise_for_status()
        except requests.HTTPError as exc:
            # Handle 400 Bad Request specifically
            if exc.response.status_code == 400:
                try:
                    error_data = exc.response.json() if exc.response.content else {}
                    error_msg = error_data.get("error", {}).get("message", str(exc))
                    error_type = error_data.get("error", {}).get("type", "unknown")
                    logger.error(f"LM Studio 400 Bad Request: {error_msg} (type: {error_type})")
                    logger.error(f"Request payload: model={settings.LM_MODEL_NAME}, url={url}, payload_keys={list(payload.keys())}")
                    
                    # Provide helpful error message
                    if "model" in str(error_msg).lower() or "not found" in str(error_msg).lower():
                        raise RuntimeError(
                            f"Model '{settings.LM_MODEL_NAME}' is not loaded or not available in LM Studio. "
                            f"Please check:\n"
                            f"1. The model name in your .env file matches the model loaded in LM Studio\n"
                            f"2. The model is loaded in LM Studio's 'Server' tab (not just the Chat tab)\n"
                            f"3. The server is running and accessible at {settings.LM_STUDIO_BASE_URL}\n"
                            f"Error details: {error_msg}"
                        ) from exc
                    else:
                        raise RuntimeError(
                            f"LM Studio returned a Bad Request (400) error. "
                            f"This usually means:\n"
                            f"1. The model name '{settings.LM_MODEL_NAME}' doesn't match what's loaded in LM Studio\n"
                            f"2. The request format is invalid\n"
                            f"3. The payload is too large\n\n"
                            f"Please check:\n"
                            f"- Model name in .env: {settings.LM_MODEL_NAME}\n"
                            f"- LM Studio Server tab shows the model is loaded\n"
                            f"- Try reloading the model in LM Studio\n"
                            f"Error: {error_msg}"
                        ) from exc
                except (ValueError, KeyError):
                    # If we can't parse the error response, provide generic message
                    logger.error(f"LM Studio 400 Bad Request: {exc.response.text}")
                    raise RuntimeError(
                        f"LM Studio returned a Bad Request (400) error. "
                        f"Please check:\n"
                        f"1. Model '{settings.LM_MODEL_NAME}' is loaded in LM Studio's Server tab\n"
                        f"2. The model name in .env matches the loaded model\n"
                        f"3. LM Studio server is running at {settings.LM_STUDIO_BASE_URL}\n"
                        f"Response: {exc.response.text[:200]}"
                    ) from exc
            elif exc.response.status_code == 404:
                error_data = exc.response.json() if exc.response.content else {}
                error_msg = error_data.get("error", {}).get("message", str(exc))
                logger.error(f"LM Studio 404: {error_msg}. Model '{settings.LM_MODEL_NAME}' may not be loaded for chat completions.")
                raise RuntimeError(
                    f"Chat model '{settings.LM_MODEL_NAME}' is not loaded or not available for chat completions. "
                    f"Please ensure the model is loaded in LM Studio's Developer tab. "
                    f"Error: {error_msg}"
                ) from exc
            else:
                logger.exception(f"LM Studio HTTP error {exc.response.status_code}: {exc}")
                raise RuntimeError(f"Failed to generate documentation: {exc.response.status_code} {str(exc)}") from exc
        except requests.Timeout:
            logger.error(f"LM Studio request timed out after {request_timeout} seconds")
            raise RuntimeError(
                f"Request timed out after {request_timeout} seconds. Please try again or check LM Studio connection."
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
            
            # Remove thinking/reasoning patterns from the output
            result = self._clean_thinking_content(content_result.strip())
            
            # Ensure minimum quality - if response is too short, it might be an error
            if len(result) < 100:
                logger.warning(f"Response too short ({len(result)} chars), might be incomplete")
                # Still return it, but log a warning - might be valid for very small inputs
            
            logger.info(f"Successfully generated documentation: {len(result)} characters")
            return result
            
        except (KeyError, IndexError, TypeError) as exc:
            logger.exception(f"Unexpected LM Studio response: {response.text}")
            raise RuntimeError("Invalid response structure from LM Studio") from exc
    
    @staticmethod
    def _clean_thinking_content(content: str) -> str:
        """Remove thinking/reasoning patterns from model output - very aggressive cleaning"""
        if not content:
            return content
        
        # First, remove explicit thinking tags and their content
        content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL | re.IGNORECASE)
        content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL | re.IGNORECASE)
        
        # Find the first real content (heading, code block, table, etc.)
        lines = content.split('\n')
        first_content_idx = -1
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            if not stripped:
                continue
            # Real content markers
            if (stripped.startswith('#') or 
                stripped.startswith('```') or 
                stripped.startswith('|') or
                (stripped.startswith('##') and len(stripped) > 3)):
                first_content_idx = i
                break
        
        # If we found content, check if there's thinking before it
        if first_content_idx > 0:
            pre_content = '\n'.join(lines[:first_content_idx]).lower()
            thinking_indicators = [
                'okay', 'i need to', 'let me', 'first,', 'looking at', 'wait,',
                'i see', 'the user', 'based on', 'i should', 'i will', 'i can',
                'i think', 'i understand', 'now i', 'so i', 'well,', 'actually',
            ]
            # If pre-content contains thinking indicators, remove it all
            if any(indicator in pre_content for indicator in thinking_indicators):
                content = '\n'.join(lines[first_content_idx:])
                lines = content.split('\n')
        
        cleaned_lines = []
        skip_until_content = True
        found_first_heading = False
        
        # Comprehensive patterns that indicate thinking/reasoning
        thinking_patterns = [
            r'^okay,?\s+i\s+need\s+to',
            r'^let\s+me\s+',
            r'^first,?\s+',
            r'^looking\s+at\s+',
            r'^wait,?\s+',
            r'^i\s+see\s+that',
            r'^the\s+user\s+',
            r'^based\s+on\s+the\s+',
            r'^i\s+should\s+',
            r'^i\s+will\s+',
            r'^i\s+can\s+',
            r'^i\s+think\s+',
            r'^i\s+believe\s+',
            r'^i\s+understand\s+',
            r'^let\s+me\s+start\s+by',
            r'^let\s+me\s+analyze',
            r'^let\s+me\s+check',
            r'^let\s+me\s+review',
            r'^now\s+i\s+',
            r'^so\s+i\s+',
            r'^well,?\s+',
            r'^hmm,?\s+',
            r'^actually,?\s+',
            r'^basically,?\s+',
            r'^essentially,?\s+',
        ]
        
        # Phrases that indicate thinking (anywhere in line)
        thinking_phrases_in_line = [
            'okay, i need to',
            'let me',
            'first, looking at',
            'wait, the user',
            'based on the context',
            'i should',
            'i will',
            'i can',
            'i think',
            'i believe',
            'i understand',
            'let me start',
            'let me analyze',
            'now i need',
            'so i',
        ]
        
        for i, line in enumerate(lines):
            line_stripped = line.strip()
            line_lower = line_stripped.lower()
            
            # Skip empty lines if we haven't found content yet
            if not line_stripped:
                if not skip_until_content:
                    cleaned_lines.append(line)
                continue
            
            # Check for explicit thinking markers
            if '<think>' in line_lower or '</think>' in line_lower or '<think>' in line_lower:
                continue
            
            # Check if line starts with thinking pattern
            is_thinking_start = any(re.match(pattern, line_lower) for pattern in thinking_patterns)
            
            # Check if line contains thinking phrases (for longer thinking blocks)
            contains_thinking = any(phrase in line_lower[:100] for phrase in thinking_phrases_in_line)
            
            # Check if this looks like a thinking block (long paragraph starting with thinking)
            is_thinking_block = (
                skip_until_content and 
                (is_thinking_start or contains_thinking) and
                not line_stripped.startswith('#') and
                not line_stripped.startswith('```') and
                not line_stripped.startswith('|') and
                len(line_stripped) > 30  # Long thinking paragraphs
            )
            
            # If we're still skipping and this is thinking, skip it
            if skip_until_content and (is_thinking_start or is_thinking_block):
                # Check next several lines for multi-line thinking blocks
                lookahead_count = 0
                max_lookahead = 10  # Check up to 10 lines ahead
                for j in range(i + 1, min(i + max_lookahead + 1, len(lines))):
                    next_line = lines[j].strip()
                    if not next_line:
                        continue
                    next_lower = next_line.lower()
                    # If next line is real content, stop looking
                    if (next_line.startswith('#') or next_line.startswith('```') or 
                        next_line.startswith('|')):
                        break
                    # If next line also looks like thinking, count it
                    next_is_thinking = any(
                        re.match(pattern, next_lower) or 
                        any(phrase in next_lower[:50] for phrase in thinking_phrases_in_line)
                        for pattern in thinking_patterns
                    )
                    if next_is_thinking:
                        lookahead_count += 1
                    else:
                        break
                
                # If we have a thinking block (this line + lookahead), skip all of them
                if lookahead_count > 0 or is_thinking_block:
                    # Skip this line and the thinking block
                    continue
            
            # Detect actual documentation content
            is_real_content = (
                line_stripped.startswith('#') or  # Heading
                line_stripped.startswith('```') or  # Code block
                line_stripped.startswith('|') or  # Table
                (line_stripped.startswith('-') and len(line_stripped) > 3 and not line_lower.startswith('- let me')) or  # List item
                (line_stripped[0].isdigit() and '.' in line_stripped[:5] and len(line_stripped) > 5) or  # Numbered list
                (line_stripped.startswith('**') and line_stripped.endswith('**')) or  # Bold heading
                found_first_heading  # After first heading, everything is content
            )
            
            # If we find real content, stop skipping
            if is_real_content:
                skip_until_content = False
                if line_stripped.startswith('#'):
                    found_first_heading = True
            
            # Add the line if we're not skipping
            if not skip_until_content:
                cleaned_lines.append(line)
            elif not (is_thinking_start or contains_thinking):
                # Even if skipping, add lines that don't look like thinking
                cleaned_lines.append(line)
        
        result = '\n'.join(cleaned_lines).strip()
        
        # Additional cleanup: Remove thinking patterns that might have slipped through
        # Remove paragraphs that start with thinking phrases
        paragraphs = result.split('\n\n')
        cleaned_paragraphs = []
        for para in paragraphs:
            para_stripped = para.strip()
            if not para_stripped:
                cleaned_paragraphs.append(para)
                continue
            
            para_lower = para_stripped.lower()
            # Skip paragraphs that are clearly thinking
            is_thinking_para = any(
                para_lower.startswith(phrase) or phrase in para_lower[:50]
                for phrase in thinking_phrases_in_line
            ) and not para_stripped.startswith('#') and not para_stripped.startswith('```')
            
            if not is_thinking_para:
                cleaned_paragraphs.append(para)
        
        result = '\n\n'.join(cleaned_paragraphs).strip()
        
        # Final pass: Find first heading and remove everything before it if thinking detected
        result_lines = result.split('\n')
        first_heading_idx = -1
        
        # Find first real heading
        for i, line in enumerate(result_lines):
            stripped = line.strip()
            if stripped.startswith('#') and len(stripped) > 2:
                first_heading_idx = i
                break
        
        # If we found a heading and there's content before it, check for thinking
        if first_heading_idx > 0:
            pre_heading = '\n'.join(result_lines[:first_heading_idx]).lower()
            # Check if pre-heading content contains thinking
            has_thinking_before = any(
                phrase in pre_heading for phrase in thinking_phrases_in_line
            ) or any(
                re.search(pattern, pre_heading) for pattern in thinking_patterns
            )
            
            # If thinking detected before first heading, remove it all
            if has_thinking_before:
                result_lines = result_lines[first_heading_idx:]
        
        # Final cleanup: Remove any remaining thinking lines at the start
        final_lines = []
        found_content_start = False
        
        for line in result_lines:
            line_stripped = line.strip()
            if not line_stripped:
                if found_content_start:
                    final_lines.append(line)
                continue
            
            line_lower = line_stripped.lower()
            is_thinking = any(
                line_lower.startswith(phrase) or phrase in line_lower[:50]
                for phrase in thinking_phrases_in_line
            ) or any(
                re.match(pattern, line_lower) for pattern in thinking_patterns
            )
            
            # If it's a heading or code block, it's definitely content
            if line_stripped.startswith('#') or line_stripped.startswith('```'):
                found_content_start = True
                final_lines.append(line)
            elif found_content_start:
                # After finding content, include everything
                final_lines.append(line)
            elif not is_thinking:
                # Include non-thinking lines even before content
                final_lines.append(line)
                if len(line_stripped) > 30:  # Substantial content
                    found_content_start = True
        
        return '\n'.join(final_lines).strip()

