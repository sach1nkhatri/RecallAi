"""PDF generator implementation using FPDF"""

import os
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
    def _parse_markdown(markdown_text: str) -> list[dict]:
        """Parse markdown into structured blocks"""
        blocks: list[dict] = []
        for raw_line in markdown_text.splitlines():
            line = raw_line.rstrip()
            if not line:
                blocks.append({"type": "spacer"})
                continue
            if line.startswith("#"):
                level = len(line) - len(line.lstrip("#"))
                text = line.lstrip("#").strip()
                blocks.append({"type": "heading", "level": level, "text": text})
            elif line.startswith("-") or line.startswith("*"):
                text = line[1:].strip()
                blocks.append({"type": "bullet", "text": text, "prefix": "-"})
            elif line[:3].isdigit() and line[3:4] == ".":
                text = line[4:].strip()
                blocks.append({"type": "bullet", "text": text, "prefix": line[:2].strip()})
            else:
                blocks.append({"type": "paragraph", "text": line})
        return blocks
    
    def generate_from_markdown(self, markdown: str, output_path: Path) -> None:
        """Generate PDF from markdown content"""
        output_dir = Path(os.path.dirname(str(output_path)) or ".")
        output_dir.mkdir(parents=True, exist_ok=True)
        
        pdf = SimplePDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        base_width = getattr(pdf, "epw", None) or (pdf.w - 2 * pdf.l_margin)
        
        blocks = self._parse_markdown(self._latin_safe(markdown))
        for block in blocks:
            btype = block["type"]
            if btype == "spacer":
                pdf.ln(6)
                continue
            if btype == "heading":
                level = block.get("level", 1)
                size = 16 if level == 1 else 14 if level == 2 else 12
                pdf.set_font("Helvetica", style="B", size=size)
                pdf.multi_cell(base_width, 8, block["text"])
                pdf.ln(2)
                continue
            if btype == "bullet":
                pdf.set_font("Helvetica", size=12)
                prefix = block.get("prefix") or "-"
                pdf.multi_cell(base_width, 6, f"{prefix} {block['text']}")
                continue
            if btype == "paragraph":
                pdf.set_font("Helvetica", size=12)
                pdf.multi_cell(base_width, 6, block["text"])
                pdf.ln(1)
                continue
        
        pdf.output(str(output_path))

