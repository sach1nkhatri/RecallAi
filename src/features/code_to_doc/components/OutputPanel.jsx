import React, { useMemo, useState, useEffect } from 'react';
import GenerationLogs from './GenerationLogs';
import '../css/OutputPanel.css';

// Helper to get backend API base URL
const getBackendApiBase = () => {
  if (typeof window === 'undefined') return 'http://localhost:5001';
  const envApi = process.env.REACT_APP_API_BASE_URL;
  if (envApi) return envApi;
  // Auto-detect based on current origin
  if (window.location.origin.startsWith('http')) {
    // If running on same origin, use it; otherwise default to backend port
    return window.location.port === '3000' || !window.location.port
      ? 'http://localhost:5001'
      : window.location.origin.replace(window.location.port, '5001');
  }
  return 'http://localhost:5001';
};

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

const OutputPanel = ({ output, pdfLink, pdfInfo, summary, generationStatus, isGenerating: isGeneratingProp, onCancelGeneration, onClearStatus }) => {
  const renderedHtml = useMemo(() => enhancedMarkdownToHtml(output), [output]);
  const metadata = useMemo(() => extractDocumentMetadata(output), [output]);
  const hasContent = output && output !== 'Generated documentation will appear here.';
  const [isErrorDismissed, setIsErrorDismissed] = useState(false);
  
  // Check if we're currently generating (from status or prop)
  const isGeneratingFromStatus = generationStatus && ['pending', 'ingesting', 'scanning', 'indexing', 'generating', 'merging'].includes(generationStatus.status);
  const isGenerating = isGeneratingProp || isGeneratingFromStatus;
  const isFailed = generationStatus && generationStatus.status === 'failed';
  const isCompleted = generationStatus && generationStatus.status === 'completed';
  
  // Reset dismissed state when status changes from failed to something else
  useEffect(() => {
    if (!isFailed) {
      setIsErrorDismissed(false);
    }
  }, [isFailed]);
  
  // Handle error dismissal - clear status and allow fresh start
  const handleDismissError = () => {
    setIsErrorDismissed(true);
    if (onClearStatus) {
      onClearStatus();
    }
  };
  
  // Show content if we have content AND we're not actively generating
  // This covers:
  // - Completed generations (with or without status)
  // - History documents (with or without status)
  // - Legacy output from useCode2Doc hook
  const shouldShowContent = hasContent && !isGenerating && !isFailed;
  
  // Show logs if: generating (from prop or status), failed (and not dismissed), or if we have status but not completed yet
  // This ensures the status panel stays visible throughout the entire process
  const showLogs = isGenerating || (isFailed && !isErrorDismissed) || (generationStatus && !isCompleted && !isFailed && !isErrorDismissed);

  return (
    <div className="ctd-output-panel">
      {/* Show generation logs when generating, failed, or status exists */}
      {showLogs && (
        <GenerationLogs 
          status={generationStatus} 
          onCancel={onCancelGeneration}
          onDismiss={isFailed ? handleDismissError : undefined}
        />
      )}

      {/* Show content when available and generation is completed, or when viewing history without status */}
      {shouldShowContent && (
        <>
          <div className="ctd-doc-header">
            <div className="ctd-doc-meta">
              {metadata?.title && (
                <div className="ctd-doc-title-meta">{metadata.title}</div>
              )}
              {summary ? (
                <div className="ctd-doc-date">{summary}</div>
              ) : (
                <div className="ctd-doc-date">
                  Generated on {new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
            </div>
          </div>
          
          <div className="ctd-doc-wrap">
            <div className="doc-preview">
              <div
                className="doc-content"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            </div>
          </div>
          
          <div className="ctd-actions">
            {pdfLink && (() => {
              const backendBase = getBackendApiBase();
              const fullUrl = pdfLink.startsWith('http') ? pdfLink : `${backendBase}${pdfLink}`;
              return (
                <a 
                  className="ctd-download-btn" 
                  href={fullUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  title="View PDF in new window"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  View PDF
                </a>
              );
            })()}
            {summary && (
              <div className="ctd-summary-info">
                <strong>Summary:</strong> {summary}
              </div>
            )}
            {pdfInfo && (
              <div className="ctd-pdf-info">
                <span className="ctd-pdf-icon">✓</span>
                PDF Generated: {pdfInfo}
              </div>
            )}
          </div>
        </>
      )}

      {/* Show empty state when no content and not generating */}
      {!showLogs && !hasContent && (
        <div className="ctd-empty-output">
          <div className="ctd-empty-content">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            <h3>No Documentation Yet</h3>
            <p>Upload files or connect a GitHub repository to generate documentation.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutputPanel;
