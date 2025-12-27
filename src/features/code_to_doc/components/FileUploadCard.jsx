import React, { useRef, useState } from 'react';
import '../css/FileUploadCard.css';

const MAX_FILES = 5;
const SUPPORTED_EXT = new Set([
  'py', 'js', 'jsx', 'ts', 'tsx', 'java', 'kt', 'dart', 'go', 'rs', 'cpp', 'c', 'h', 'cs',
  'html', 'css', 'md', 'txt', 'json', 'yaml', 'yml',
  'pdf', 'doc', 'docx', 'xml'
]);

const FileUploadCard = ({ onUpload, fileInfo, isUploading, onError, uploads = [], onAutoGenerate, isGenerating, mode = 'upload', rawContent = '' }) => {
  const fileRef = useRef(null);
  const [selectedNames, setSelectedNames] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const filterSupported = (files) => {
    const supported = [];
    const unsupported = [];
    files.forEach((file) => {
      const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
      if (SUPPORTED_EXT.has(ext)) {
        supported.push(file);
      } else {
        unsupported.push(file.name);
      }
    });
    if (unsupported.length) {
      onError?.(`Unsupported files skipped: ${unsupported.join(', ')}`);
    }
    return supported;
  };

  const handleUploadClick = () => {
    const files = fileRef.current?.files;
    if (!files) return;
    const list = filterSupported(Array.from(files));
    if (list.length === 0) return;
    if (list.length > MAX_FILES) {
      onError?.(`Maximum ${MAX_FILES} files allowed. You selected ${list.length}.`);
      return;
    }
    onUpload(list);
    setSelectedNames([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFileChange = (e) => {
    const list = filterSupported(Array.from(e.target.files || []));
    setSelectedNames(list.map((f) => f.name));
    if (list.length > MAX_FILES) {
      onError?.(`Maximum ${MAX_FILES} files allowed. You selected ${list.length}.`);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const list = filterSupported(files);
    if (list.length > 0 && list.length <= MAX_FILES) {
      onUpload(list);
      setSelectedNames([]);
    } else if (list.length > MAX_FILES) {
      onError?.(`Maximum ${MAX_FILES} files allowed. You selected ${list.length}.`);
    }
  };

  const handleAreaClick = () => {
    fileRef.current?.click();
  };

  const tooMany = selectedNames.length > MAX_FILES;
  const disabled = isUploading || selectedNames.length === 0 || tooMany;

  return (
    <div className="ctd-card">
      <h3>Upload Files</h3>
      
      <div
        className={`ctd-file-upload-area ${isDragging ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleAreaClick}
      >
        <div className="ctd-file-upload-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div className="ctd-file-upload-text">
          {isDragging ? 'Drop files here' : 'Click or drag files to upload'}
        </div>
        <div className="ctd-file-upload-hint">
          Supported: Code files, documents, text files (max {MAX_FILES} files)
        </div>
      </div>

      <input
        type="file"
        ref={fileRef}
        id="fileInput"
        accept=".py,.js,.jsx,.ts,.tsx,.java,.kt,.dart,.go,.rs,.cpp,.c,.h,.cs,.html,.css,.md,.txt,.json,.yaml,.yml,.pdf,.doc,.docx,.xml"
        multiple
        onChange={handleFileChange}
      />

      <div className="ctd-file-meta">
        {selectedNames.length > 0 && (
          <div className="ctd-file-count">
            <span>{selectedNames.length} / {MAX_FILES} files selected</span>
            {tooMany && <span className="ctd-error">Too many files</span>}
          </div>
        )}
        {selectedNames.length > 0 && !tooMany && (
          <div className="ctd-file-list">
            {selectedNames.map((name) => (
              <div key={name} className="ctd-file-chip">{name}</div>
            ))}
          </div>
        )}
      </div>

      <button onClick={handleUploadClick} disabled={disabled}>
        {isUploading ? (
          <>
            <span className="spinner"></span>
            Uploading...
          </>
        ) : (
          'Upload & Load'
        )}
      </button>

      {fileInfo && (
        <div className="ctd-file-info">{fileInfo}</div>
      )}

      {rawContent && onAutoGenerate && (
        <div className="ctd-auto-generate-section">
          <div className="ctd-auto-generate-header">
            <div className="ctd-auto-generate-icon">✓</div>
            <div>
              <div className="ctd-auto-generate-title">Content Ready</div>
              <div className="ctd-auto-generate-subtitle">
                {uploads.length} file{uploads.length !== 1 ? 's' : ''} processed successfully
              </div>
            </div>
          </div>
          <button 
            className="ctd-auto-generate-btn"
            onClick={onAutoGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="spinner"></span>
                Generating Documentation...
              </>
            ) : (
              <>
                <span>🚀</span>
                Generate Documentation
              </>
            )}
          </button>
        </div>
      )}

      <div className="ctd-uploaded-list">
        <div className="ctd-uploaded-list-title">Current Session Uploads</div>
        <div className="ctd-uploaded-items">
          {uploads.length === 0 ? (
            <div className="ctd-uploaded-item empty">No files uploaded in this session.</div>
          ) : (
            uploads.map((u) => {
              const sizeKb = Number.isFinite(u.size) ? (u.size / 1024).toFixed(1) : '0';
              return (
                <div key={u.id} className="ctd-uploaded-item">
                  <span className="ctd-uploaded-name">{u.name}</span>
                  <span className="ctd-uploaded-size">{sizeKb} KB</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUploadCard;
