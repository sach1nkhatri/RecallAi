import React, { useState, useRef } from 'react';
import '../css/DocumentUploadCard.css';

const DocumentUploadCard = ({ botId, onUploadComplete, onError }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState({ stage: '', percentage: 0 });
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const fileInputRef = useRef(null);

  const getApiBase = () => {
    if (typeof window === 'undefined') return 'http://localhost:5001';
    const envApi = process.env.REACT_APP_API_BASE_URL;
    if (envApi) return envApi;
    return window.location.port === '3000' || !window.location.port
      ? 'http://localhost:5001'
      : window.location.origin;
  };

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;
    if (!botId) {
      onError('Please save the bot configuration first');
      return;
    }

    setIsUploading(true);
    setProgress({ stage: 'Uploading files...', percentage: 10 });

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });
      formData.append('bot_id', botId);

      setProgress({ stage: 'Uploading files...', percentage: 30 });

      const response = await fetch(`${getApiBase()}/api/bots/${botId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || 'Failed to upload documents');
      }

      setProgress({ stage: 'Vectorizing documents...', percentage: 60 });

      const data = await response.json();
      
      // Wait a bit for vectorization to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setProgress({ stage: 'Complete!', percentage: 100 });

      // Fetch updated document list
      const docsResponse = await fetch(`${getApiBase()}/api/bots/${botId}/documents`);
      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        setUploadedDocs(docsData.documents || []);
      }

      onUploadComplete();
      
      setTimeout(() => {
        setProgress({ stage: '', percentage: 0 });
      }, 2000);
    } catch (error) {
      console.error('Upload error:', error);
      onError(error.message || 'Failed to upload documents');
      setProgress({ stage: '', percentage: 0 });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const loadDocuments = async () => {
    if (!botId) return;
    try {
      const response = await fetch(`${getApiBase()}/api/bots/${botId}/documents`);
      if (response.ok) {
        const data = await response.json();
        setUploadedDocs(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  React.useEffect(() => {
    if (botId) {
      loadDocuments();
    }
  }, [botId]);

  return (
    <div className="doc-upload-card">
      <div className="doc-upload-header">
        <div className="doc-upload-header-main">
          <div className="doc-upload-header-icon"></div>
          <div>
            <h3>Step 2: Add Your Documents</h3>
            <p className="doc-upload-subtitle">
              Upload files your bot will learn from. PDFs, Word docs, and text files work great!
            </p>
          </div>
        </div>
      </div>

      <div
        className={`doc-upload-area ${isUploading ? 'uploading' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.doc,.docx"
          onChange={(e) => handleFileSelect(e.target.files)}
          style={{ display: 'none' }}
          disabled={isUploading}
        />
        
        {isUploading ? (
          <div className="doc-upload-progress">
            <div className="doc-upload-progress-bar">
              <div
                className="doc-upload-progress-fill"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <p className="doc-upload-progress-text">{progress.stage}</p>
          </div>
        ) : (
          <>
            <div className="doc-upload-icon"></div>
            <p className="doc-upload-text">
              Click or drag files to upload
            </p>
            <p className="doc-upload-hint">
              Supported: PDF, TXT, MD, DOC, DOCX
            </p>
          </>
        )}
      </div>

      {uploadedDocs.length > 0 && (
        <div className="doc-upload-list">
          <h4>Uploaded Documents ({uploadedDocs.length})</h4>
          <div className="doc-upload-items">
            {uploadedDocs.map((doc, idx) => (
              <div key={idx} className="doc-upload-item">
                <span className="doc-upload-item-icon"></span>
                <span className="doc-upload-item-name">{doc.filename || doc.name}</span>
                {doc.status && (
                  <span className={`doc-upload-item-status ${doc.status}`}>
                    {doc.status === 'vectorized' ? '✓ Ready' : 'Processing...'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUploadCard;

