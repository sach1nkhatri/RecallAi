import React from 'react';
import '../css/GenerationProgress.css';

const GenerationProgress = ({ status, onCancel }) => {
  if (!status) return null;

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
        return 'Ingesting Files';
      case 'scanning':
        return 'Scanning Repository';
      case 'indexing':
        return 'Building Index';
      case 'generating':
        return 'Generating Documentation';
      case 'merging':
        return 'Merging Chapters';
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

  const formatTime = (seconds) => {
    if (!seconds) return '';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const getElapsedTime = () => {
    if (!status.startedAt) return '';
    const elapsed = (Date.now() - new Date(status.startedAt)) / 1000;
    return formatTime(elapsed);
  };

  const isActive = ['pending', 'ingesting', 'scanning', 'indexing', 'generating', 'merging'].includes(status.status);
  const canCancel = isActive && onCancel;

  return (
    <div className="generation-progress-container">
      <div className="generation-progress-card">
        <div className="generation-progress-header">
          <div className="generation-progress-title">
            <span className="generation-progress-icon">{getStatusIcon()}</span>
            <div>
              <h3>Documentation Generation</h3>
              <p className="generation-progress-subtitle">{getStatusLabel()}</p>
            </div>
          </div>
          {canCancel && (
            <button
              className="generation-progress-cancel"
              onClick={() => onCancel(status._id)}
              title="Cancel generation"
            >
              ✕
            </button>
          )}
        </div>

        {isActive && (
          <div className="generation-progress-body">
            {/* Progress Bar */}
            <div className="generation-progress-bar-container">
              <div
                className="generation-progress-bar"
                style={{
                  width: `${status.progress || 0}%`,
                  backgroundColor: getStatusColor(),
                }}
              />
            </div>
            <div className="generation-progress-info">
              <span className="generation-progress-percentage">{status.progress || 0}%</span>
              {status.currentStep && (
                <span className="generation-progress-step">{status.currentStep}</span>
              )}
            </div>

            {/* Steps Progress */}
            {status.totalSteps > 0 && (
              <div className="generation-progress-steps">
                <span>
                  Step {status.completedSteps || 0} of {status.totalSteps}
                </span>
              </div>
            )}

            {/* Time Information */}
            <div className="generation-progress-time">
              {getElapsedTime() && (
                <span>Elapsed: {getElapsedTime()}</span>
              )}
              {status.estimatedTimeRemaining && (
                <span>Est. remaining: {formatTime(status.estimatedTimeRemaining)}</span>
              )}
            </div>

            {/* Additional Info */}
            {status.type === 'github_repo' && status.repoInfo && (
              <div className="generation-progress-repo-info">
                <span>Files: {status.repoInfo.includedFiles || 0} / {status.repoInfo.totalFiles || 0}</span>
              </div>
            )}
            {status.type === 'file_upload' && status.fileCount > 0 && (
              <div className="generation-progress-file-info">
                <span>Files: {status.fileCount}</span>
              </div>
            )}
          </div>
        )}

        {status.status === 'completed' && (
          <div className="generation-progress-completed">
            <div className="generation-progress-success-message">
              <span className="generation-progress-success-icon">✓</span>
              <div>
                <p>Documentation generated successfully!</p>
                {status.pdfUrl && (
                  <a
                    href={status.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="generation-progress-download-link"
                  >
                    Download PDF
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {status.status === 'failed' && status.error && (
          <div className="generation-progress-error">
            <p className="generation-progress-error-message">
              {status.error.message || 'Generation failed'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerationProgress;

