import React, { useState } from 'react';
import '../css/GitHubRepoCard.css';

const GitHubRepoCard = ({
  onIngest,
  onGenerate,
  isIngesting,
  isGenerating,
  repoInfo,
  onError,
}) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [repoId, setRepoId] = useState('');

  const handleIngest = async () => {
    if (!repoUrl.trim()) {
      onError?.('Please enter a GitHub repository URL.');
      return;
    }

    try {
      const result = await onIngest(repoUrl.trim());
      if (result?.repo_id) {
        setRepoId(result.repo_id);
      }
    } catch (err) {
      // Error handled by parent
    }
  };

  const handleGenerate = async () => {
    if (!repoUrl.trim()) {
      onError?.('Please enter a GitHub repository URL.');
      return;
    }

    if (!repoId) {
      onError?.('Please ingest the repository first.');
      return;
    }

    await onGenerate(repoUrl.trim(), repoId);
  };

  const isValidUrl = repoUrl.trim() && (
    repoUrl.includes('github.com') ||
    (repoUrl.includes('/') && !repoUrl.includes('://'))
  );

  return (
    <div className="ctd-card">
      <h3>GitHub Repository</h3>

      <label htmlFor="repoUrlInput">Repository URL</label>
      <input
        type="text"
        id="repoUrlInput"
        placeholder="https://github.com/owner/repo or owner/repo"
        value={repoUrl}
        onChange={(e) => {
          setRepoUrl(e.target.value);
          setRepoId(''); // Reset repo_id when URL changes
        }}
        disabled={isIngesting || isGenerating}
        className={!isValidUrl && repoUrl.trim() ? 'ctd-input-error' : ''}
      />
      <div className="ctd-muted" style={{ marginTop: '4px', marginBottom: '16px' }}>
        Enter a public GitHub repository URL or owner/repo format
      </div>

      {repoInfo && (
        <div className="ctd-repo-info">
          <div className="ctd-repo-info-header">
            <span className="ctd-success-icon">✓</span>
            <strong>Repository Ingested</strong>
          </div>
          <div className="ctd-repo-info-details">
            <div>
              <span className="ctd-label">Repository:</span>
              <span>{repoInfo.owner}/{repoInfo.repo_name}</span>
            </div>
            <div>
              <span className="ctd-label">Files:</span>
              <span>{repoInfo.total_files} included</span>
            </div>
            {repoInfo.warnings && repoInfo.warnings.length > 0 && (
              <div className="ctd-repo-warnings">
                <strong>Warnings:</strong>
                <ul>
                  {repoInfo.warnings.slice(0, 3).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="ctd-repo-actions">
        <button
          onClick={handleIngest}
          disabled={!isValidUrl || isIngesting || isGenerating}
          className="ctd-btn-secondary"
        >
          {isIngesting ? (
            <>
              <span className="spinner"></span>
              Ingesting Repository...
            </>
          ) : (
            '1. Ingest Repository'
          )}
        </button>

        <button
          onClick={handleGenerate}
          disabled={!repoId || isGenerating || isIngesting}
          className="ctd-btn-primary"
        >
          {isGenerating ? (
            <>
              <span className="spinner"></span>
              Generating Documentation...
            </>
          ) : (
            <>
              <span>🚀</span>
              2. Generate Documentation
            </>
          )}
        </button>
      </div>

      <div className="ctd-repo-hint">
        <p><strong>How it works:</strong></p>
        <ol>
          <li>Enter a public GitHub repository URL</li>
          <li>Click "Ingest Repository" to scan and index files</li>
          <li>Click "Generate Documentation" to create comprehensive docs using RAG</li>
        </ol>
        <p className="ctd-muted">
          The system will automatically filter files, build a vector index, and generate
          chapter-by-chapter documentation.
        </p>
        <p className="ctd-muted" style={{ fontSize: '12px', marginTop: '8px' }}>
          <strong>File Limits:</strong> Up to 100 files analyzed per repository/zip archive. 
          Common directories (node_modules, .git, dist, build, etc.) are automatically excluded.
        </p>
      </div>
    </div>
  );
};

export default GitHubRepoCard;

