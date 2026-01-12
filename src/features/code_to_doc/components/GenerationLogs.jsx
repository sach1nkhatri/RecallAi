import React, { useEffect, useRef, useState } from 'react';
import '../css/GenerationLogs.css';

const GenerationLogs = ({ status, onCancel }) => {
  const logsEndRef = useRef(null);
  const [logs, setLogs] = useState([]);
  const logsRef = useRef([]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Accumulate logs from status updates
  useEffect(() => {
    if (status && status.currentStep) {
      const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      const logEntry = {
        timestamp,
        status: status.status,
        message: status.currentStep,
        progress: status.progress || 0,
      };

      // Only add if it's a new message (avoid duplicates)
      const lastLog = logsRef.current[logsRef.current.length - 1];
      const isNewMessage = !lastLog || 
        lastLog.message !== logEntry.message || 
        lastLog.status !== logEntry.status ||
        (lastLog.progress !== logEntry.progress && logEntry.progress > 0);

      if (isNewMessage) {
        logsRef.current.push(logEntry);
        // Keep only last 100 logs
        if (logsRef.current.length > 100) {
          logsRef.current = logsRef.current.slice(-100);
        }
        setLogs([...logsRef.current]);
      }
    }
  }, [status?.currentStep, status?.status, status?.progress]);

  // Clear logs when generation starts and add initial log
  useEffect(() => {
    if (status && status.status === 'pending' && logsRef.current.length === 0) {
      const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      logsRef.current = [{
        timestamp,
        status: 'pending',
        message: 'Initializing generation...',
        progress: 0,
      }];
      setLogs([...logsRef.current]);
    }
  }, [status?.status]);

  if (!status) return null;

  const isActive = ['pending', 'ingesting', 'scanning', 'indexing', 'generating', 'merging'].includes(status.status);
  const isCompleted = status.status === 'completed';
  const isFailed = status.status === 'failed';

  const getStatusIcon = () => {
    switch (status.status) {
      case 'pending':
        return '⏳';
      case 'ingesting':
        return '📥';
      case 'scanning':
        return '🔍';
      case 'indexing':
        return '📚';
      case 'generating':
        return '✨';
      case 'merging':
        return '🔗';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'completed':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      case 'pending':
        return '#6b7280';
      default:
        return '#3b82f6';
    }
  };

  const getStatusLabel = () => {
    switch (status.status) {
      case 'pending':
        return 'Queued';
      case 'ingesting':
        return 'Ingesting';
      case 'scanning':
        return 'Scanning';
      case 'indexing':
        return 'Indexing';
      case 'generating':
        return 'Generating';
      case 'merging':
        return 'Merging';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return status.status;
    }
  };

  return (
    <div className="generation-logs">
      <div className="generation-logs-header">
        <div className="generation-logs-status">
          <span className="generation-logs-icon">{getStatusIcon()}</span>
          <div className="generation-logs-status-info">
            <span className="generation-logs-label">{getStatusLabel()}</span>
            {isActive && (
              <span className="generation-logs-progress-text">{status.progress || 0}%</span>
            )}
          </div>
        </div>
        {isActive && onCancel && (
          <button
            className="generation-logs-cancel"
            onClick={() => onCancel(status._id)}
            title="Cancel Generation"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Cancel
          </button>
        )}
      </div>

      {isActive && (
        <div className="generation-logs-progress-container">
          <div className="generation-logs-progress-bar">
            <div
              className="generation-logs-progress-fill"
              style={{
                width: `${status.progress || 0}%`,
                backgroundColor: getStatusColor()
              }}
            />
          </div>
        </div>
      )}

      <div className="generation-logs-content">
        {logs.length === 0 && isActive && (
          <div className="generation-logs-empty">
            <div className="generation-logs-spinner"></div>
            <span>Initializing generation...</span>
          </div>
        )}

        {logs.length > 0 && (
          <div className="generation-logs-list">
            {logs.map((log, index) => (
              <div key={index} className="generation-logs-item">
                <span className="generation-logs-timestamp">{log.timestamp}</span>
                <span className="generation-logs-message">{log.message}</span>
                {log.progress > 0 && (
                  <span className="generation-logs-progress-badge">{log.progress}%</span>
                )}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}

        {isCompleted && (
          <div className="generation-logs-success">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <div>
              <strong>Generation Completed Successfully!</strong>
              <p>Your documentation is ready to view.</p>
            </div>
          </div>
        )}

        {isFailed && (
          <div className="generation-logs-error">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <strong>Generation Failed</strong>
              <p>{status.error?.message || 'An error occurred during generation'}</p>
            </div>
          </div>
        )}
      </div>

      {status.totalSteps > 0 && (
        <div className="generation-logs-footer">
          <span>Step {status.completedSteps || 0} of {status.totalSteps}</span>
          {status.fileCount > 0 && (
            <span>• {status.fileCount} file(s)</span>
          )}
        </div>
      )}
    </div>
  );
};

export default GenerationLogs;

