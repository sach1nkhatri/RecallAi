import React from 'react';
import useCode2Doc from '../hooks/useCode2Doc';
import useGenerationStatus from '../hooks/useGenerationStatus';
import FileUploadCard from '../components/FileUploadCard';
import GitHubRepoCard from '../components/GitHubRepoCard';
import OutputPanel from '../components/OutputPanel';
import HistoryModal from '../components/HistoryModal';
import Toast from '../components/Toast';
import '../css/CodeToDocPage.css';

const CodeToDocPage = () => {
  const {
    status: generationStatus,
    cancelGeneration,
    clearStatus,
  } = useGenerationStatus();

  const {
    state: {
      fileInfo,
      output,
      pdfLink,
      pdfInfo,
      isUploading,
      isGenerating,
      isIngesting,
      toast,
      summary,
      uploads,
      apiHealth,
      repoInfo,
      rawContent,
      isReadyForGeneration,
    },
    actions: {
      handleUpload,
      handleGenerate,
      handleRepoIngest,
      handleRepoGenerate,
      showToast,
    },
  } = useCode2Doc();

  const [activeMode, setActiveMode] = React.useState('upload'); // 'upload' or 'github'
  const [selectedHistoryDoc, setSelectedHistoryDoc] = React.useState(null);
  const [showHistoryModal, setShowHistoryModal] = React.useState(false);

  // Auto-detect mode based on state
  React.useEffect(() => {
    if (uploads.length > 0) {
      setActiveMode('upload');
    } else if (repoInfo) {
      setActiveMode('github');
    }
  }, [uploads.length, repoInfo]);

  // Handle history document selection
  const handleHistorySelect = (doc) => {
    if (doc) {
      setSelectedHistoryDoc(doc);
      setShowHistoryModal(false);
    } else {
      setSelectedHistoryDoc(null);
    }
  };

  // Handle modal open/close with body scroll lock
  React.useEffect(() => {
    if (showHistoryModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showHistoryModal]);

  const handleModeSwitch = (mode) => {
    setActiveMode(mode);
  };

  const getHealthClass = () => {
    if (!apiHealth || !apiHealth.status) return 'unknown';
    return apiHealth.status;
  };

  const getHealthLabel = () => {
    if (!apiHealth || !apiHealth.status) return 'Checking...';
    const status = apiHealth.status;
    if (status === 'healthy') return 'API Online';
    if (status === 'offline') return 'API Offline';
    return 'API Unavailable';
  };
  
  const getSystemInfo = () => {
    try {
      if (!apiHealth?.data) return null;
      const data = apiHealth.data;
      // Safely access nested properties
      if (data.platform && data.faiss) {
        return {
          platform: data.platform,
          faiss: data.faiss,
        };
      }
      return null;
    } catch (error) {
      console.warn('Error getting system info:', error);
      return null;
    }
  };

  return (
    <div className="ctd-page">
      <Toast message={toast.message} type={toast.type} />
      
      <header className="ctd-header">
        <div className="ctd-header-content">
          <div className="ctd-header-left">
            <p className="ctd-step-label">Dashboard / Code → Documentation</p>
            <h1>Code → Documentation</h1>
            <p className="ctd-tagline">
              Generate professional documentation from your code. Upload files or connect a GitHub repository.
            </p>
          </div>
          <div className="ctd-header-actions">
            <button
              className="ctd-history-toggle"
              onClick={() => setShowHistoryModal(true)}
              title="View Generation History"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <span>History</span>
            </button>
          </div>
          <div className="ctd-header-right">
            <div className={`ctd-api-health ${getHealthClass()}`}>
              <span className="ctd-api-health-dot"></span>
              <span>{getHealthLabel()}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="ctd-container">
        {/* History Modal */}
        <HistoryModal 
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          onSelectDocument={handleHistorySelect}
        />

        {/* Show completed generation results if available */}
        {generationStatus && generationStatus.status === 'completed' && generationStatus.markdown && !selectedHistoryDoc && (
          <div className="ctd-result-section">
            <OutputPanel 
              output={generationStatus.markdown} 
              pdfLink={generationStatus.pdfUrl} 
              pdfInfo={generationStatus.pdfInfo?.filename || ''} 
              summary={`Completed at ${new Date(generationStatus.completedAt || generationStatus.updatedAt || Date.now()).toLocaleString()}`}
              generationStatus={generationStatus}
              onClearStatus={clearStatus}
            />
          </div>
        )}

        {/* History documents now open in new window - no need to show here */}

        <div className={`ctd-workspace ${(generationStatus && generationStatus.status === 'completed' && generationStatus.markdown) ? 'full-width' : ''}`}>
          <div className="ctd-left">
            <div className="ctd-mode-selector">
              <div className="ctd-mode-tabs">
                <button 
                  className={`ctd-mode-tab ${activeMode === 'upload' ? 'active' : ''}`}
                  onClick={() => handleModeSwitch('upload')}
                  disabled={isUploading || isGenerating || isIngesting}
                >
                  <span className="ctd-mode-icon">📁</span>
                  Upload Files
                </button>
                <button 
                  className={`ctd-mode-tab ${activeMode === 'github' ? 'active' : ''}`}
                  onClick={() => handleModeSwitch('github')}
                  disabled={isUploading || isGenerating || isIngesting}
                >
                  <span className="ctd-mode-icon">🔗</span>
                  GitHub Repository
                </button>
              </div>
              <p className="ctd-mode-hint">
                {activeMode === 'upload'
                  ? 'Upload code files (max 5) to automatically extract content and generate documentation'
                  : 'Connect a public GitHub repository to generate comprehensive documentation using RAG'}
              </p>
            </div>

            {activeMode === 'upload' ? (
              <section className="ctd-panel">
                <div className="ctd-section-header">
                  <div className="ctd-section-title">Upload Files</div>
                </div>
                <FileUploadCard
                  onUpload={handleUpload}
                  fileInfo={fileInfo}
                  isUploading={isUploading}
                  onError={(msg) => showToast(msg, 'error')}
                  uploads={uploads}
                  onAutoGenerate={handleGenerate}
                  isGenerating={isGenerating}
                  mode="upload"
                  rawContent={rawContent}
                  isReadyForGeneration={isReadyForGeneration}
                />
              </section>
            ) : (
              <section className="ctd-panel">
                <div className="ctd-section-header">
                  <div className="ctd-section-title">GitHub Repository</div>
                </div>
                <GitHubRepoCard
                  onIngest={handleRepoIngest}
                  onGenerate={handleRepoGenerate}
                  isIngesting={isIngesting}
                  isGenerating={isGenerating}
                  repoInfo={repoInfo}
                  onError={(msg) => showToast(msg, 'error')}
                />
              </section>
            )}
          </div>

          {/* Show right sidebar if: 
              - No history doc selected AND
              - (Generation is in progress OR no completed result with markdown) */}
          {!selectedHistoryDoc && (
            (!(generationStatus && generationStatus.status === 'completed' && generationStatus.markdown) || 
             isGenerating ||
             (generationStatus && ['pending', 'ingesting', 'scanning', 'indexing', 'generating', 'merging', 'failed'].includes(generationStatus.status))) && (
              <div className="ctd-right">
                <section className="ctd-panel ctd-output-panel">
                  <div className="ctd-section-header">
                    <div className="ctd-section-title">
                      {(isGenerating || (generationStatus && ['pending', 'ingesting', 'scanning', 'indexing', 'generating', 'merging', 'failed'].includes(generationStatus.status)))
                        ? 'Generation Status' 
                        : 'Output Preview'}
                    </div>
                    {output && output !== 'Generated documentation will appear here.' && !generationStatus && !isGenerating && (
                      <span className="ctd-badge ctd-badge-success">Ready</span>
                    )}
                  </div>
                  <OutputPanel 
                    output={output} 
                    pdfLink={pdfLink} 
                    pdfInfo={pdfInfo} 
                    summary={summary}
                    generationStatus={generationStatus}
                    isGenerating={isGenerating}
                    onCancelGeneration={generationStatus && generationStatus.status !== 'completed' && generationStatus.status !== 'failed' ? cancelGeneration : undefined}
                    onClearStatus={clearStatus}
                  />
                </section>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeToDocPage;
