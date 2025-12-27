import React, { useMemo } from 'react';
import '../css/OutputPanel.css';

const enhancedMarkdownToHtml = (text) => {
  if (!text) return '<div class="ctd-empty-output"><p>(No content generated yet)</p></div>';
  
  const lines = text.split(/\r?\n/);
  const html = [];
  let inList = false;
  let listType = '';
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockContent = [];
  let inTable = false;
  let tableRows = [];
  
  const processInlineMarkdown = (text) => {
    // Bold **text** or __text__
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    // Italic *text* or _text_
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    text = text.replace(/_([^_]+)_/g, '<em>$1</em>');
    // Inline code `code`
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Links [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return text;
  };
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Code blocks
    if (/^```/.test(trimmed)) {
      if (inCodeBlock) {
        // End code block
        const codeContent = codeBlockContent.join('\n');
        html.push(`<pre><code class="language-${codeBlockLang}">${escapeHtml(codeContent)}</code></pre>`);
        codeBlockContent = [];
        codeBlockLang = '';
        inCodeBlock = false;
      } else {
        // Start code block
        if (inList) {
          html.push(`</${listType}>`);
          inList = false;
        }
        codeBlockLang = trimmed.replace(/^```/, '').trim() || 'text';
        inCodeBlock = true;
      }
      return;
    }
    
    if (inCodeBlock) {
      codeBlockContent.push(line);
      return;
    }
    
    // Tables
    if (/^\|/.test(trimmed) && trimmed.includes('|')) {
      if (!inTable) {
        if (inList) {
          html.push(`</${listType}>`);
          inList = false;
        }
        html.push('<table>');
        inTable = true;
      }
      const cells = trimmed.split('|').map(c => c.trim()).filter(c => c);
      const isHeader = cells.some(c => /^[-:]+$/.test(c));
      
      if (isHeader) {
        // Skip separator row
        return;
      }
      
      html.push('<tr>');
      cells.forEach(cell => {
        const tag = tableRows.length === 0 ? 'th' : 'td';
        html.push(`<${tag}>${processInlineMarkdown(cell)}</${tag}>`);
      });
      html.push('</tr>');
      tableRows.push(cells);
      return;
    } else if (inTable) {
      html.push('</table>');
      inTable = false;
      tableRows = [];
    }
    
    // Headings
    if (/^####\s+/.test(trimmed)) {
      if (inList) {
        html.push(`</${listType}>`);
        inList = false;
      }
      const text = processInlineMarkdown(trimmed.replace(/^####\s+/, ''));
      html.push(`<h4>${text}</h4>`);
      return;
    } else if (/^###\s+/.test(trimmed)) {
      if (inList) {
        html.push(`</${listType}>`);
        inList = false;
      }
      const text = processInlineMarkdown(trimmed.replace(/^###\s+/, ''));
      html.push(`<h3>${text}</h3>`);
      return;
    } else if (/^##\s+/.test(trimmed)) {
      if (inList) {
        html.push(`</${listType}>`);
        inList = false;
      }
      const text = processInlineMarkdown(trimmed.replace(/^##\s+/, ''));
      html.push(`<h2>${text}</h2>`);
      return;
    } else if (/^#\s+/.test(trimmed)) {
      if (inList) {
        html.push(`</${listType}>`);
        inList = false;
      }
      const text = processInlineMarkdown(trimmed.replace(/^#\s+/, ''));
      html.push(`<h1>${text}</h1>`);
      return;
    }
    
    // Blockquotes
    if (/^>\s+/.test(trimmed)) {
      if (inList) {
        html.push(`</${listType}>`);
        inList = false;
      }
      const text = processInlineMarkdown(trimmed.replace(/^>\s+/, ''));
      html.push(`<blockquote>${text}</blockquote>`);
      return;
    }
    
    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      if (inList) {
        html.push(`</${listType}>`);
        inList = false;
      }
      html.push('<hr>');
      return;
    }
    
    // Lists
    if (/^(\d+\.)\s+/.test(trimmed)) {
      if (!inList || listType !== 'ol') {
        if (inList) html.push(`</${listType}>`);
        html.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      const text = processInlineMarkdown(trimmed.replace(/^\d+\.\s+/, ''));
      html.push(`<li>${text}</li>`);
      return;
    } else if (/^[-*+]\s+/.test(trimmed)) {
      if (!inList || listType !== 'ul') {
        if (inList) html.push(`</${listType}>`);
        html.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      const text = processInlineMarkdown(trimmed.replace(/^[-*+]\s+/, ''));
      html.push(`<li>${text}</li>`);
      return;
    }
    
    // Regular paragraphs
    if (!trimmed) {
      if (inList) {
        html.push(`</${listType}>`);
        inList = false;
      }
      return;
    }
    
    if (inList) {
      html.push(`</${listType}>`);
      inList = false;
    }
    
    const processed = processInlineMarkdown(trimmed);
    html.push(`<p>${processed}</p>`);
  });
  
  if (inList) {
    html.push(`</${listType}>`);
  }
  if (inTable) {
    html.push('</table>');
  }
  if (inCodeBlock) {
    const codeContent = codeBlockContent.join('\n');
    html.push(`<pre><code class="language-${codeBlockLang}">${escapeHtml(codeContent)}</code></pre>`);
  }
  
  return html.join('\n');
};

const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

const extractDocumentMetadata = (text) => {
  if (!text) return null;
  
  const lines = text.split(/\r?\n/);
  const titleMatch = lines.find(line => /^#\s+/.test(line.trim()));
  const title = titleMatch ? titleMatch.replace(/^#\s+/, '').trim() : null;
  
  return { title };
};

const OutputPanel = ({ output, pdfLink, pdfInfo, summary }) => {
  const renderedHtml = useMemo(() => enhancedMarkdownToHtml(output), [output]);
  const metadata = useMemo(() => extractDocumentMetadata(output), [output]);
  const hasContent = output && output !== 'Generated documentation will appear here.';

  return (
    <div className="ctd-output-panel">
      {hasContent && (
        <div className="ctd-doc-header">
          <div className="ctd-doc-meta">
            {metadata?.title && (
              <div className="ctd-doc-title-meta">{metadata.title}</div>
            )}
            <div className="ctd-doc-date">
              Generated on {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        </div>
      )}
      
      <div className="ctd-doc-wrap">
        <div className="doc-preview">
          <div
            className="doc-content"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </div>
      </div>
      
      <div className="ctd-actions">
        {pdfLink && (
          <a className="ctd-download-btn" href={pdfLink} download>
            <span className="ctd-download-icon">📄</span>
            Download PDF
          </a>
        )}
        {summary && (
          <div className="ctd-summary-info">
            <strong>Source:</strong> {summary}
          </div>
        )}
        {pdfInfo && (
          <div className="ctd-pdf-info">
            <span className="ctd-pdf-icon">✓</span>
            {pdfInfo}
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputPanel;
