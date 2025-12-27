import React from 'react';
import useCode2Doc from '../hooks/useCode2Doc';
import FileUploadCard from '../components/FileUploadCard';
import GitHubRepoCard from '../components/GitHubRepoCard';
import OutputPanel from '../components/OutputPanel';
import Toast from '../components/Toast';
import '../css/CodeToDocPage.css';

const CodeToDocPage = () => {
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

  // Auto-detect mode based on state
  React.useEffect(() => {
    if (uploads.length > 0) {
      setActiveMode('upload');
    } else if (repoInfo) {
      setActiveMode('github');
    }
  }, [uploads.length, repoInfo]);

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
          <div className="ctd-header-right">
            <div className={`ctd-api-health ${getHealthClass()}`}>
              <span className="ctd-api-health-dot"></span>
              <span>{getHealthLabel()}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="ctd-container">
        <div className="ctd-workspace">
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

          <div className="ctd-right">
            <section className="ctd-panel ctd-output-panel">
              <div className="ctd-section-header">
                <div className="ctd-section-title">Output Preview</div>
                {output && output !== 'Generated documentation will appear here.' && (
                  <span className="ctd-badge ctd-badge-success">Ready</span>
                )}
              </div>
              <OutputPanel output={output} pdfLink={pdfLink} pdfInfo={pdfInfo} summary={summary} />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeToDocPage;
