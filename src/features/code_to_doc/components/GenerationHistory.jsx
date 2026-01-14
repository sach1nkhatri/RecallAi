import React, { useState, useEffect } from 'react';
import useGenerationHistory from '../../dashboard/hooks/useGenerationHistory';
import { nodeApiRequest } from '../../../core/utils/nodeApi';
import '../css/GenerationHistory.css';

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

const GenerationHistory = ({ onSelectDocument }) => {
  const { history, isLoading, formatDate, getStatusColor, getStatusLabel, fetchHistory } = useGenerationHistory();
  const [expandedId, setExpandedId] = useState(null);

  // Fetch more items when component mounts
  useEffect(() => {
    fetchHistory(1, 20);
  }, [fetchHistory]);

  const handleViewDocument = async (item, e) => {
    e?.stopPropagation();
    // Open documentation in a new window with proper markdown rendering
    try {
      const data = await nodeApiRequest(`/api/generation-status/${item._id}`, {
        timeout: 10000, // 10 second timeout
      });
      if (data.success && data.status && data.status.markdown) {
        // Use the same markdown to HTML conversion as OutputPanel
        const markdownHtml = enhancedMarkdownToHtml(data.status.markdown);
        
        // Create a new tab with the documentation
        const docTitle = data.status.repoUrl 
          ? data.status.repoUrl.replace('https://github.com/', '').replace(/\/$/, '')
          : 'Documentation';
        
        // Create a blob URL with the HTML content
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>${docTitle}</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 60px 80px;
      line-height: 1.6;
      color: #1f2937;
      background: #ffffff;
    }
    h1 { font-size: 36px; font-weight: 800; margin: 0 0 12px; line-height: 1.1; color: #111827; letter-spacing: -0.5px; border-bottom: 4px solid #6366f1; padding-bottom: 20px; margin-bottom: 32px; }
    h2 { font-size: 28px; font-weight: 700; margin: 48px 0 20px; line-height: 1.2; color: #1f2937; padding-top: 12px; border-top: 2px solid #e5e7eb; letter-spacing: -0.3px; }
    h2:first-of-type { border-top: none; padding-top: 0; margin-top: 32px; }
    h3 { font-size: 22px; font-weight: 600; margin: 32px 0 16px; line-height: 1.3; color: #374151; letter-spacing: -0.2px; }
    h4 { font-size: 18px; font-weight: 600; margin: 24px 0 12px; color: #4b5563; line-height: 1.4; }
    p { margin: 0 0 20px; color: #374151; line-height: 1.75; font-size: 16px; text-align: justify; text-justify: inter-word; }
    code { background: #f3f4f6; padding: 3px 8px; border-radius: 4px; font-family: 'JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', monospace; font-size: 0.9em; color: #dc2626; border: 1px solid #e5e7eb; font-weight: 500; }
    pre { background: #1e293b; color: #e2e8f0; padding: 24px; border-radius: 8px; overflow-x: auto; margin: 24px 0; border: 1px solid #334155; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    pre code { background: transparent; padding: 0; color: inherit; border: none; font-size: 14px; line-height: 1.6; display: block; white-space: pre; }
    ul, ol { margin: 0 0 24px 32px; padding: 0; color: #374151; }
    ul { list-style-type: disc; }
    ol { list-style-type: decimal; }
    li { margin-bottom: 12px; line-height: 1.8; font-size: 16px; }
    li::marker { color: #6366f1; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin: 32px 0; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden; }
    th, td { padding: 14px 16px; border: 1px solid #e5e7eb; text-align: left; font-size: 15px; }
    th { background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); font-weight: 700; color: #111827; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px; }
    tr:nth-child(even) { background: #f9fafb; }
    tr:hover { background: #f3f4f6; }
    blockquote { border-left: 4px solid #6366f1; padding: 16px 24px; margin: 24px 0; background: #f9fafb; color: #4b5563; font-style: italic; border-radius: 0 8px 8px 0; }
    blockquote p { margin: 0; font-size: 15px; }
    hr { border: none; border-top: 2px solid #e5e7eb; margin: 40px 0; }
    a { color: #6366f1; text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.2s; }
    a:hover { border-bottom-color: #6366f1; }
    strong { font-weight: 700; color: #111827; }
    em { font-style: italic; color: #4b5563; }
  </style>
</head>
<body>
  <div class="doc-content">
    ${markdownHtml}
  </div>
</body>
</html>`;
        
        // Create blob and open in new tab
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const newTab = window.open(url, '_blank');
        
        // Clean up the blob URL after a short delay
        if (newTab) {
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 100);
        }
      }
    } catch (error) {
      console.error('Failed to fetch document:', error);
      alert('Failed to open documentation. Please try again.');
    }
  };
  
  // Markdown to HTML converter (same as OutputPanel)
  const enhancedMarkdownToHtml = (text) => {
    if (!text) return '<div><p>(No content)</p></div>';
    
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
    
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
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

  // Don't render viewer here - let parent handle it via onSelectDocument
  // This keeps the history list visible

  return (
    <div className="generation-history">
      <div className="generation-history-header">
        <h3 className="generation-history-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          Previous Generations
        </h3>
        <button 
          className="generation-history-refresh"
          onClick={() => fetchHistory(1, 20)}
          title="Refresh"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.7L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
      </div>

      {isLoading ? (
        <div className="generation-history-loading">
          <div className="generation-history-spinner"></div>
          <span>Loading history...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="generation-history-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          <p>No previous generations</p>
          <span>Your generated documentation will appear here</span>
        </div>
      ) : (
        <div className="generation-history-list">
          {history.map((item) => (
            <div 
              key={item._id} 
              className={`generation-history-item ${expandedId === item._id ? 'expanded' : ''}`}
              onClick={() => setExpandedId(expandedId === item._id ? null : item._id)}
            >
              <div className="generation-history-item-header">
                <div className="generation-history-item-type">
                  {item.type === 'github_repo' ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      <span>GitHub</span>
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                        <polyline points="13 2 13 9 20 9"></polyline>
                      </svg>
                      <span>Files</span>
                    </>
                  )}
                </div>
                <div 
                  className="generation-history-item-status" 
                  style={{ backgroundColor: getStatusColor(item.status) }}
                >
                  {getStatusLabel(item.status)}
                </div>
              </div>
              <div className="generation-history-item-content">
                {item.repoUrl && (
                  <div className="generation-history-item-repo">
                    <strong>Repo:</strong> {item.repoUrl.replace('https://github.com/', '')}
                  </div>
                )}
                {item.fileCount > 0 && (
                  <div className="generation-history-item-info">
                    <strong>Files:</strong> {item.fileCount}
                  </div>
                )}
                <div className="generation-history-item-date">
                  {formatDate(item.createdAt)}
                </div>
              </div>
              {item.status === 'completed' && (
                <div className="generation-history-item-actions">
                  <button
                    className="generation-history-view-btn"
                    onClick={(e) => handleViewDocument(item, e)}
                    title="View full documentation in new window"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    View Documentation
                  </button>
                  {item.pdfUrl && (() => {
                    const backendBase = getBackendApiBase();
                    const fullUrl = item.pdfUrl.startsWith('http') ? item.pdfUrl : `${backendBase}${item.pdfUrl}`;
                    return (
                      <a
                        href={fullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="generation-history-pdf-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        title="View PDF in new window"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        View PDF
                      </a>
                    );
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GenerationHistory;

