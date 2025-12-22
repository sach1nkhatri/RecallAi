import React from 'react';
import useCode2Doc from '../hooks/useCode2Doc';
import useProjects from '../hooks/useProjects';
import FileUploadCard from '../components/FileUploadCard';
import EditorCard from '../components/EditorCard';
import OutputPanel from '../components/OutputPanel';
import ProjectSelector from '../components/ProjectSelector';
import GenerationHistory from '../components/GenerationHistory';
import Toast from '../components/Toast';
import '../css/CodeToDocPage.css';

const CodeToDocPage = () => {
  const { projects, activeProject, activeProjectId, createProject, selectProject } = useProjects();
  const {
    state: {
      fileInfo,
      title,
      contentType,
      rawContent,
      status,
      output,
      pdfLink,
      pdfInfo,
      isUploading,
      isGenerating,
      toast,
      summary,
      uploads,
      generations,
      progress,
      apiHealth,
    },
    actions: { setTitle, setContentType, setRawContent, handleUpload, handleGenerate, showToast },
  } = useCode2Doc(activeProjectId);

  const noProject = !activeProject;

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
              Generate professional documentation from your code or text. Select a project, upload files, then generate.
            </p>
          </div>
          <div className="ctd-header-right">
            <div className={`ctd-api-health ${getHealthClass()}`}>
              <span className="ctd-api-health-dot"></span>
              <span>{getHealthLabel()}</span>
            </div>
            <div className="ctd-active-project">
              <span className="ctd-label">Active Project</span>
              <strong>{activeProject?.name || 'No project selected'}</strong>
            </div>
          </div>
        </div>
      </header>

      <div className="ctd-container">
        <section className="ctd-panel ctd-project-panel">
          <div className="ctd-section-title">1. Select Project</div>
          <ProjectSelector
            projects={projects}
            activeProject={activeProject}
            activeProjectId={activeProjectId}
            onSelect={selectProject}
            onCreate={createProject}
          />
          {noProject && (
            <p className="ctd-muted" style={{ marginTop: '12px' }}>
              Choose or create a project to start uploading and generating docs.
            </p>
          )}
        </section>

        <div className="ctd-workspace">
          <div className="ctd-left">
            <section className="ctd-panel" aria-disabled={noProject}>
              <div className="ctd-section-title">2. Upload Code or Docs</div>
              {noProject && (
                <p className="ctd-muted">Project required. Select a project above to enable uploads.</p>
              )}
              <FileUploadCard
                onUpload={handleUpload}
                fileInfo={fileInfo}
                isUploading={isUploading}
                onError={(msg) => showToast(msg, 'error')}
                uploads={uploads}
                activeProject={activeProject}
                progress={progress}
              />
            </section>

            <section className="ctd-panel" aria-disabled={noProject}>
              <div className="ctd-section-title">3. Generate Documentation</div>
              {noProject && (
                <p className="ctd-muted">Project required. Select a project above to enable generation.</p>
              )}
              <EditorCard
                title={title}
                onTitleChange={setTitle}
                contentType={contentType}
                onContentTypeChange={setContentType}
                rawContent={rawContent}
                onRawContentChange={setRawContent}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                status={status}
                progress={progress}
              />
            </section>

            <section className="ctd-panel">
              <div className="ctd-section-title">4. Generation History</div>
              <GenerationHistory generations={generations} />
            </section>
          </div>

          <div className="ctd-right">
            <section className="ctd-panel">
              <div className="ctd-section-title">Output Preview</div>
              <OutputPanel output={output} pdfLink={pdfLink} pdfInfo={pdfInfo} summary={summary} />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeToDocPage;
