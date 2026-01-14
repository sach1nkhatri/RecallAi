"""PDF generator implementation using FPDF"""

import os
import re
from pathlib import Path
from fpdf import FPDF

from src.application.interfaces.pdf_generator import PDFGenerator


class SimplePDF(FPDF):
    """Custom PDF class with minimal header"""
    
    def header(self):
        """Minimal header - can be overridden if needed"""
        pass


class FPDFGenerator(PDFGenerator):
    """FPDF-based PDF generator implementation"""
    
    @staticmethod
    def _latin_safe(text: str) -> str:
        """Convert text to latin-1 safe encoding"""
        return text.encode("latin-1", "replace").decode("latin-1")
    
    @staticmethod
    def _process_inline_formatting(text: str) -> str:
        """Process inline markdown formatting (bold, italic, code, links)"""
        # Remove markdown formatting and keep plain text
        # Bold **text** or __text__
        text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
        text = re.sub(r'__([^_]+)__', r'\1', text)
        # Italic *text* or _text_ (but not if part of **)
        text = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'\1', text)
        text = re.sub(r'(?<!_)_([^_]+)_(?!_)', r'\1', text)
        # Inline code `code`
        text = re.sub(r'`([^`]+)`', r'\1', text)
        # Links [text](url) -> text (url)
        text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
        return text
    
    @staticmethod
    def _parse_markdown(markdown_text: str) -> list[dict]:
        """Parse markdown into structured blocks - matches frontend preview structure"""
        blocks: list[dict] = []
        lines = markdown_text.splitlines()
        i = 0
        in_code_block = False
        code_block_lang = ''
        code_block_content = []
        in_table = False
        table_rows = []
        in_list = False
        list_type = None  # 'ul' or 'ol'
        list_items = []
        
        def flush_list():
            """Helper to flush current list to blocks"""
            nonlocal in_list, list_type, list_items
            if in_list and list_items:
                blocks.append({
                    "type": "list",
                    "list_type": list_type,
                    "items": list_items
                })
                list_items = []
            in_list = False
            list_type = None
        
        while i < len(lines):
            raw_line = lines[i]
            line = raw_line.rstrip()
            trimmed = line.strip()
            
            # Code blocks
            if trimmed.startswith('```'):
                if in_code_block:
                    # End code block
                    flush_list()  # Close any open list
                    blocks.append({
                        "type": "code_block",
                        "language": code_block_lang,
                        "content": '\n'.join(code_block_content)
                    })
                    code_block_content = []
                    code_block_lang = ''
                    in_code_block = False
                else:
                    # Start code block
                    flush_list()  # Close any open list
                    code_block_lang = trimmed.replace('```', '').strip() or 'text'
                    in_code_block = True
                i += 1
                continue
            
            if in_code_block:
                code_block_content.append(line)
                i += 1
                continue
            
            # Tables
            if trimmed.startswith('|') and '|' in trimmed:
                flush_list()  # Close any open list
                if not in_table:
                    blocks.append({"type": "table_start"})
                    in_table = True
                    table_rows = []
                
                cells = [c.strip() for c in trimmed.split('|') if c.strip()]
                # Skip separator row (---)
                if not any(re.match(r'^[-:]+$', cell) for cell in cells):
                    table_rows.append(cells)
                i += 1
                continue
            elif in_table:
                blocks.append({"type": "table_end", "rows": table_rows})
                in_table = False
                table_rows = []
            
            # Empty line - ends lists and adds spacer
            if not trimmed:
                flush_list()  # Close list if open
                blocks.append({"type": "spacer"})
                i += 1
                continue
            
            # Headings (all levels) - must have space after #
            if re.match(r'^#{1,4}\s+', trimmed):
                flush_list()  # Close any open list
                level = len(trimmed) - len(trimmed.lstrip('#'))
                text = trimmed.lstrip('#').strip()
                blocks.append({
                    "type": "heading",
                    "level": min(level, 4),  # Support up to h4
                    "text": FPDFGenerator._process_inline_formatting(text)
                })
                i += 1
                continue
            
            # Blockquotes
            if trimmed.startswith('>'):
                flush_list()  # Close any open list
                text = trimmed.lstrip('>').strip()
                blocks.append({
                    "type": "blockquote",
                    "text": FPDFGenerator._process_inline_formatting(text)
                })
                i += 1
                continue
            
            # Horizontal rule
            if re.match(r'^[-*_]{3,}$', trimmed):
                flush_list()  # Close any open list
                blocks.append({"type": "hr"})
                i += 1
                continue
            
            # Ordered lists (1., 2., etc.) - must have space after number
            ordered_match = re.match(r'^(\d+)\.\s+(.+)$', trimmed)
            if ordered_match:
                # If we're in a different list type, flush it
                if in_list and list_type != 'ol':
                    flush_list()
                
                if not in_list:
                    in_list = True
                    list_type = 'ol'
                
                text = ordered_match.group(2)
                list_items.append(FPDFGenerator._process_inline_formatting(text))
                i += 1
                continue
            
            # Unordered lists (-, *, +) - must have space after marker
            unordered_match = re.match(r'^[-*+]\s+(.+)$', trimmed)
            if unordered_match:
                # If we're in a different list type, flush it
                if in_list and list_type != 'ul':
                    flush_list()
                
                if not in_list:
                    in_list = True
                    list_type = 'ul'
                
                text = unordered_match.group(1)
                list_items.append(FPDFGenerator._process_inline_formatting(text))
                i += 1
                continue
            
            # Regular paragraph - if we're in a list, flush it first
            flush_list()  # Close any open list before paragraph
            
            # Only add paragraph if there's actual content
            if trimmed:
                blocks.append({
                    "type": "paragraph",
                    "text": FPDFGenerator._process_inline_formatting(line)
                })
            i += 1
        
        # Close any open blocks
        flush_list()  # Close any open list
        if in_code_block:
            blocks.append({
                "type": "code_block",
                "language": code_block_lang,
                "content": '\n'.join(code_block_content)
            })
        if in_table:
            blocks.append({"type": "table_end", "rows": table_rows})
        
        return blocks
    
    def generate_from_markdown(self, markdown: str, output_path: Path) -> None:
        """Generate PDF from markdown content - structured like frontend preview"""
        output_dir = Path(os.path.dirname(str(output_path)) or ".")
        output_dir.mkdir(parents=True, exist_ok=True)
        
        pdf = SimplePDF()
        pdf.set_auto_page_break(auto=True, margin=20)
        pdf.add_page()
        
        # Set margins similar to frontend preview (60px top/bottom, 80px sides)
        pdf.set_margins(30, 20, 30)  # Left, Top, Right
        base_width = pdf.w - 2 * pdf.l_margin
        
        # Title area spacing
        pdf.ln(10)
        
        blocks = self._parse_markdown(self._latin_safe(markdown))
        list_counter = 0
        
        for i, block in enumerate(blocks):
            btype = block["type"]
            
            if btype == "spacer":
                pdf.ln(6)
                continue
            
            if btype == "heading":
                level = block.get("level", 1)
                # Font sizes matching frontend: h1=36px, h2=28px, h3=22px, h4=18px
                # Convert to PDF points (1px ≈ 0.75pt)
                sizes = {1: 27, 2: 21, 3: 16, 4: 13}
                size = sizes.get(level, 12)
                
                pdf.set_font("Helvetica", style="B", size=size)
                
                # Add spacing before heading (except first)
                if i > 0:
                    pdf.ln(8 if level <= 2 else 6)
                
                # Render heading
                text = block["text"]
                pdf.multi_cell(base_width, size * 1.2, text)
                
                # Add underline for h1 (matching frontend border-bottom)
                if level == 1:
                    y = pdf.get_y()
                    pdf.line(pdf.l_margin, y - 2, pdf.l_margin + base_width, y - 2)
                
                pdf.ln(4)
                list_counter = 0
                continue
            
            if btype == "paragraph":
                pdf.set_font("Helvetica", size=11)
                text = block["text"]
                # Handle empty paragraphs
                if not text.strip():
                    pdf.ln(3)
                else:
                    # Use multi_cell for proper text wrapping
                    pdf.multi_cell(base_width, 6, text, 0, 'J')  # 'J' for justify
                    pdf.ln(3)
                list_counter = 0
                continue
            
            if btype == "list":
                list_type = block.get("list_type", "ul")
                items = block.get("items", [])
                pdf.set_font("Helvetica", size=11)
                
                for idx, item_text in enumerate(items):
                    # Indent for list item
                    pdf.set_x(pdf.l_margin + 10)
                    if list_type == "ol":
                        pdf.multi_cell(base_width - 10, 6, f"{idx + 1}. {item_text}")
                    else:
                        pdf.multi_cell(base_width - 10, 6, f"• {item_text}")
                    pdf.ln(2)
                
                pdf.ln(2)  # Extra space after list
                list_counter = 0
                continue
            
            if btype == "code_block":
                pdf.ln(6)
                pdf.set_font("Courier", size=9)
                content = block["content"]
                language = block.get("language", "text")
                
                # Calculate height needed for code block
                code_lines = content.split('\n')
                line_height = 5
                padding = 8
                total_height = len(code_lines) * line_height + padding * 2
                
                # Check if we need a new page
                if pdf.get_y() + total_height > pdf.h - pdf.b_margin:
                    pdf.add_page()
                
                y_start = pdf.get_y()
                
                # Draw code block background
                pdf.set_fill_color(30, 41, 59)  # Dark background like frontend (#1e293b)
                pdf.rect(pdf.l_margin, y_start, base_width, total_height, 'F')
                
                # Draw border
                pdf.set_draw_color(51, 65, 85)  # Border color (#334155)
                pdf.rect(pdf.l_margin, y_start, base_width, total_height, 'D')
                
                # Render code with padding
                pdf.set_text_color(226, 232, 240)  # Light text color (#e2e8f0)
                pdf.set_xy(pdf.l_margin + padding, y_start + padding)
                
                for code_line in code_lines:
                    # Handle long lines by wrapping
                    if pdf.get_string_width(code_line) > base_width - (padding * 2):
                        # Split long lines
                        words = code_line.split(' ')
                        current_line = ''
                        for word in words:
                            test_line = current_line + (' ' if current_line else '') + word
                            if pdf.get_string_width(test_line) <= base_width - (padding * 2):
                                current_line = test_line
                            else:
                                if current_line:
                                    pdf.cell(base_width - (padding * 2), line_height, current_line, 0, 1, 'L')
                                current_line = word
                        if current_line:
                            pdf.cell(base_width - (padding * 2), line_height, current_line, 0, 1, 'L')
                    else:
                        pdf.cell(base_width - (padding * 2), line_height, code_line, 0, 1, 'L')
                
                # Reset text color
                pdf.set_text_color(0, 0, 0)
                pdf.set_xy(pdf.l_margin, pdf.get_y() + padding)
                pdf.ln(6)
                list_counter = 0
                continue
            
            if btype == "blockquote":
                pdf.set_font("Helvetica", style="I", size=11)
                text = block["text"]
                # Indent for blockquote
                pdf.set_x(pdf.l_margin + 15)
                pdf.set_draw_color(200, 200, 200)
                pdf.line(pdf.l_margin + 10, pdf.get_y(), pdf.l_margin + 10, pdf.get_y() + 10)
                pdf.multi_cell(base_width - 15, 6, text)
                pdf.ln(3)
                list_counter = 0
                continue
            
            if btype == "hr":
                pdf.ln(4)
                pdf.set_draw_color(200, 200, 200)
                pdf.line(pdf.l_margin, pdf.get_y(), pdf.l_margin + base_width, pdf.get_y())
                pdf.ln(6)
                list_counter = 0
                continue
            
            if btype == "table_start":
                pdf.ln(4)
                list_counter = 0
                continue
            
            if btype == "table_end":
                rows = block.get("rows", [])
                if rows:
                    pdf.set_font("Helvetica", size=10)
                    # Simple table rendering
                    cell_width = base_width / len(rows[0]) if rows[0] else base_width
                    for row_idx, row in enumerate(rows):
                        y = pdf.get_y()
                        if y + 15 > pdf.h - pdf.b_margin:
                            pdf.add_page()
                            y = pdf.get_y()
                        
                        # Header row styling
                        if row_idx == 0:
                            pdf.set_font("Helvetica", style="B", size=10)
                            pdf.set_fill_color(240, 240, 240)
                        else:
                            pdf.set_font("Helvetica", size=10)
                            pdf.set_fill_color(255, 255, 255)
                        
                        x = pdf.l_margin
                        for cell in row:
                            pdf.rect(x, y, cell_width, 10, 'FD')
                            pdf.set_xy(x + 2, y + 3)
                            pdf.cell(cell_width - 4, 6, cell[:30] if len(cell) > 30 else cell, 0, 0, 'L')
                            x += cell_width
                        
                        pdf.set_xy(pdf.l_margin, y + 10)
                        pdf.ln(2)
                    
                    pdf.ln(4)
                continue
        
        pdf.output(str(output_path))

