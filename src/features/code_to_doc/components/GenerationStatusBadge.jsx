import React, { useState } from 'react';
import '../css/GenerationStatusBadge.css';

const GenerationStatusBadge = ({ status, onCancel }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!status) return null;

  const isActive = ['pending', 'ingesting', 'scanning', 'indexing', 'generating', 'merging'].includes(status.status);
  const canCancel = isActive && onCancel;

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
        return 'Processing';
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

  return (
    <div className="generation-status-badge">
      <div 
        className="generation-status-badge-main"
        style={{ borderLeftColor: getStatusColor() }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="generation-status-badge-content">
          <span className="generation-status-icon">{getStatusIcon()}</span>
          <div className="generation-status-text">
            <span className="generation-status-label">{getStatusLabel()}</span>
            {isActive && status.currentStep && (
              <span className="generation-status-step">{status.currentStep}</span>
            )}
          </div>
          {isActive && (
            <div className="generation-status-progress">
              <div className="generation-status-progress-bar">
                <div 
                  className="generation-status-progress-fill"
                  style={{ 
                    width: `${status.progress || 0}%`,
                    backgroundColor: getStatusColor()
                  }}
                />
              </div>
              <span className="generation-status-percentage">{status.progress || 0}%</span>
            </div>
          )}
        </div>
        {canCancel && (
          <button
            className="generation-status-cancel"
            onClick={(e) => {
              e.stopPropagation();
              onCancel(status._id);
            }}
            title="Cancel"
          >
            ✕
          </button>
        )}
      </div>

      {isExpanded && isActive && (
        <div className="generation-status-details">
          {status.totalSteps > 0 && (
            <div className="generation-status-detail-item">
              <span>Step {status.completedSteps || 0} of {status.totalSteps}</span>
            </div>
          )}
          {status.type === 'github_repo' && status.repoInfo && (
            <div className="generation-status-detail-item">
              <span>Files: {status.repoInfo.includedFiles || 0} / {status.repoInfo.totalFiles || 0}</span>
            </div>
          )}
          {status.type === 'file_upload' && status.fileCount > 0 && (
            <div className="generation-status-detail-item">
              <span>Files: {status.fileCount}</span>
            </div>
          )}
        </div>
      )}

      {status.status === 'completed' && status.pdfUrl && (
        <div className="generation-status-completed">
          <a
            href={status.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="generation-status-download"
          >
            Download PDF
          </a>
        </div>
      )}

      {status.status === 'failed' && status.error && (
        <div className="generation-status-error">
          <span>{status.error.message || 'Generation failed'}</span>
        </div>
      )}
    </div>
  );
};

export default GenerationStatusBadge;

