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
  mode = 'direct',
}) => {

  const hasContent = rawContent && rawContent.trim().length > 0;
  const charCount = rawContent ? rawContent.length : 0;

  return (
    <div className="ctd-card">
      <div className="ctd-card-header">
        <h3>Direct Text Input</h3>
        {hasContent && (
          <span className="ctd-char-count">{charCount.toLocaleString()} characters</span>
        )}
      </div>
      <p className="ctd-muted" style={{ marginBottom: '16px' }}>
        Type or paste your text or code below. Select the content type and generate professional documentation.
      </p>

      <label htmlFor="titleInput">Document Title (optional)</label>
      <input
        type="text"
        id="titleInput"
        placeholder="e.g. Authentication Module Documentation"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        disabled={isGenerating}
      />

      <div className="ctd-content-type-selector">
        <label className="ctd-content-type-label">Content Type:</label>
        <div className="ctd-radio-group">
          <label className={`ctd-radio-option ${contentType === 'text' ? 'active' : ''}`}>
            <input
              type="radio"
              name="contentType"
              value="text"
              checked={contentType === 'text'}
              onChange={(e) => onContentTypeChange(e.target.value)}
              disabled={isGenerating}
            />
            <span className="ctd-radio-custom"></span>
            <span className="ctd-radio-text">Text</span>
            <span className="ctd-radio-hint">For documents, articles, notes</span>
          </label>
          <label className={`ctd-radio-option ${contentType === 'code' ? 'active' : ''}`}>
            <input
              type="radio"
              name="contentType"
              value="code"
              checked={contentType === 'code'}
              onChange={(e) => onContentTypeChange(e.target.value)}
              disabled={isGenerating}
            />
            <span className="ctd-radio-custom"></span>
            <span className="ctd-radio-text">Code</span>
            <span className="ctd-radio-hint">For programming code, scripts</span>
          </label>
        </div>
      </div>

      <textarea
        id="rawContent"
        rows={12}
        placeholder="Paste your text or code here...&#10;&#10;The content will be processed to generate professional documentation based on the selected content type."
        value={rawContent}
        onChange={(e) => onRawContentChange(e.target.value)}
        disabled={isGenerating}
      />
      
      <div className="ctd-muted" style={{ marginBottom: '16px' }}>
        Make sure your content is ready. Select "Text" for regular text or "Code" for programming code.
      </div>

      <button className="primary" onClick={onGenerate} disabled={isGenerating || !rawContent.trim()}>
        {isGenerating ? (
          <>
            <span className="spinner"></span>
            Generating...
          </>
        ) : (
          <>
            <span></span>
            Generate Documentation
          </>
        )}
      </button>
    </div>
  );
};

export default EditorCard;
