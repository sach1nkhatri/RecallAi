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

  const handleViewDocument = async (item) => {
    // Always fetch full document to ensure we have markdown content
    // History list excludes markdown for performance, so we need to fetch it
    try {
      const data = await nodeApiRequest(`/api/generation-status/${item._id}`, {
        timeout: 10000, // 10 second timeout
      });
      if (data.success && data.status) {
        // Check if we have markdown content
        if (data.status.markdown) {
          console.log('Fetched document with markdown, length:', data.status.markdown.length);
          if (onSelectDocument) {
            onSelectDocument(data.status);
          }
        } else {
          console.warn('Document fetched but missing markdown:', {
            status: data.status.status,
            hasMarkdown: !!data.status.markdown,
            id: data.status._id
          });
          // Still try to show it if status is completed (might have markdown in different field)
          if (data.status.status === 'completed' && onSelectDocument) {
            onSelectDocument(data.status);
          }
        }
      } else {
        console.error('Failed to fetch document: Invalid response', data);
      }
    } catch (error) {
      console.error('Failed to fetch document:', error);
      // If fetch fails but item has markdown, try using it
      if (item.markdown && item.status === 'completed' && onSelectDocument) {
        console.warn('Using cached markdown from item');
        onSelectDocument(item);
      }
    }
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDocument(item);
                    }}
                    title="View full documentation"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
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

