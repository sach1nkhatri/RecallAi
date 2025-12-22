import React from 'react';
import '../css/EditorCard.css';

const EditorCard = ({
  title,
  onTitleChange,
  contentType,
  onContentTypeChange,
  rawContent,
  onRawContentChange,
  onGenerate,
  isGenerating,
  status,
  progress,
}) => {
  const showProgress = progress && progress.stage === 'generating';
  const getStatusClass = () => {
    if (!status) return '';
    if (status.includes('failed') || status.includes('error')) return 'error';
    if (status.includes('Done') || status.includes('ready')) return 'success';
    if (status.includes('Generating')) return 'warning';
    return '';
  };

  return (
    <div className="ctd-card">
      <h3>Live Editor</h3>

      <label htmlFor="titleInput">Document Title (optional)</label>
      <input
        type="text"
        id="titleInput"
        placeholder="e.g. Authentication Module Documentation"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        disabled={isGenerating}
      />

      <div className="ctd-radio-group">
        <span>Content Type:</span>
        <label>
          <input
            type="radio"
            name="contentType"
            value="text"
            checked={contentType === 'text'}
            onChange={(e) => onContentTypeChange(e.target.value)}
            disabled={isGenerating}
          />
          <span>Text</span>
        </label>
        <label>
          <input
            type="radio"
            name="contentType"
            value="code"
            checked={contentType === 'code'}
            onChange={(e) => onContentTypeChange(e.target.value)}
            disabled={isGenerating}
          />
          <span>Code</span>
        </label>
      </div>

      <textarea
        id="rawContent"
        rows={12}
        placeholder="Paste or edit your content here...&#10;&#10;You can upload files above or type directly. The content will be processed to generate professional documentation."
        value={rawContent}
        onChange={(e) => onRawContentChange(e.target.value)}
        disabled={isGenerating}
      />
      
      <div className="ctd-muted" style={{ marginBottom: '16px' }}>
        Uploaded content can be edited before generating. Make sure your content is ready.
      </div>

      {showProgress && (
        <div className="ctd-editor-progress">
          <div className="ctd-progress-container">
            <div className="ctd-progress-bar">
              <div className="ctd-progress-fill" style={{ width: `${progress.percentage}%` }}></div>
            </div>
            <div className="ctd-progress-text">{progress.stage} documentation... {Math.round(progress.percentage)}%</div>
          </div>
        </div>
      )}

      <button className="primary" onClick={onGenerate} disabled={isGenerating || !rawContent.trim()}>
        {isGenerating ? (
          <>
            <span className="spinner"></span>
            Generating...
          </>
        ) : (
          <>
            <span>✨</span>
            Generate Documentation
          </>
        )}
      </button>

      {status && (
        <div className={`ctd-status-text ${getStatusClass()}`}>
          {status}
        </div>
      )}
    </div>
  );
};

export default EditorCard;
