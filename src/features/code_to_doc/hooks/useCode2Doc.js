import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { loadUploads, saveUploads, loadGenerations, saveGenerations } from './projectStorage';

const getApiBase = () => {
  if (typeof window === 'undefined') return 'http://localhost:5001';
  // Check for environment variable or use default
  const envApi = process.env.REACT_APP_API_BASE_URL;
  if (envApi) return envApi;
  // Auto-detect based on current origin
  if (window.location.origin.startsWith('http')) {
    // If running on same origin, use it; otherwise default to backend port
    return window.location.port === '3000' || !window.location.port
      ? 'http://localhost:5001'
      : window.location.origin;
  }
  return 'http://localhost:5001';
};

const buildFallbackOutput = (rawContent, title) => {
  const safeTitle = title || 'Untitled Document';
  return [
    `# ${safeTitle}`,
    '',
    '## Overview',
    'Backend was unavailable. This is a local draft based on your input.',
    '',
    '## Source Excerpt',
    rawContent ? rawContent.slice(0, 800) : '(no content)',
  ].join('\n');
};

const useCode2Doc = (activeProjectId = null) => {
  const apiBase = useMemo(getApiBase, []);
  const [fileInfo, setFileInfo] = useState('');
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState('text');
  const [rawContent, setRawContent] = useState('');
  const [status, setStatus] = useState('');
  const [output, setOutput] = useState('Generated documentation will appear here.');
  const [pdfLink, setPdfLink] = useState('');
  const [pdfInfo, setPdfInfo] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const timersRef = useRef([]);
  const [summary, setSummary] = useState('');
  const [lastUploadMeta, setLastUploadMeta] = useState({ fileCount: null, contentType: null });
  const [allUploads, setAllUploads] = useState(() => loadUploads());
  const [uploads, setUploads] = useState([]);
  const [allGenerations, setAllGenerations] = useState(() => loadGenerations());
  const [generations, setGenerations] = useState([]);
  const [progress, setProgress] = useState({ stage: '', percentage: 0 });
  const [apiHealth, setApiHealth] = useState({ status: 'unknown', lastCheck: null });

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'info' }), 2800);
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  // Check API health on mount and periodically
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${apiBase}/api/health`, { method: 'GET' });
        const data = await res.json();
        const newStatus = data.status === 'ok' ? 'healthy' : 'unhealthy';
        // Only update if status actually changed to prevent unnecessary re-renders
        setApiHealth((prev) => {
          if (prev.status === newStatus) return prev;
          return { status: newStatus, lastCheck: new Date(), data };
        });
      } catch {
        setApiHealth((prev) => {
          if (prev.status === 'offline') return prev;
          return { status: 'offline', lastCheck: new Date() };
        });
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [apiBase]);

  useEffect(() => {
    if (!activeProjectId) {
      setUploads([]);
      setGenerations([]);
      return;
    }
    setUploads(allUploads.filter((item) => item.projectId === activeProjectId));
    setGenerations(allGenerations.filter((g) => g.projectId === activeProjectId));
  }, [activeProjectId, allUploads, allGenerations]);

  const handleUpload = useCallback(
    async (files) => {
      if (!activeProjectId) {
        showToast('Select or create a project first.', 'error');
        return;
      }

      if (!files || files.length === 0) {
        showToast('Please choose file(s) first.', 'error');
        return;
      }

      const formData = new FormData();
      files.forEach((file) => formData.append('file', file));

      setIsUploading(true);
      setStatus('Uploading...');
      setProgress({ stage: 'uploading', percentage: 0 });

      try {
        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
          setProgress((prev) => ({
            ...prev,
            percentage: Math.min(prev.percentage + 10, 90),
          }));
        }, 200);

        const res = await fetch(`${apiBase}/api/upload`, {
          method: 'POST',
          body: formData,
        });

        clearInterval(progressInterval);
        setProgress({ stage: 'processing', percentage: 95 });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        setRawContent(data.content || '');
        setContentType(data.content_type || 'text');
        setLastUploadMeta({
          fileCount: data.file_count || null,
          contentType: data.content_type || null,
        });
        setSummary('');

        const label = data.file_count
          ? `${data.file_count} file(s): ${data.filename}`
          : data.filename || 'files loaded';

        setFileInfo(`Loaded ${label} (${data.content_type})`);
        setStatus('File loaded. You can edit the content before generating.');

        if (data.skipped && data.skipped.length) {
          showToast(`Skipped unsupported: ${data.skipped.join(', ')}`, 'error');
        } else {
          showToast('Upload ready', 'info');
        }

        const now = new Date().toISOString();
        const newUploads = (files || []).map((file, idx) => ({
          id:
            (typeof crypto !== 'undefined' && crypto.randomUUID)
              ? crypto.randomUUID()
              : `upload-${Date.now()}-${idx}`,
          projectId: activeProjectId,
          name: file.name,
          size: file.size,
          type: file.type || 'unknown',
          uploadedAt: now,
        }));

        setAllUploads((prev) => {
          const next = [...prev, ...newUploads];
          saveUploads(next);
          return next;
        });
        setProgress({ stage: 'complete', percentage: 100 });
        setTimeout(() => setProgress({ stage: '', percentage: 0 }), 1000);
      } catch (err) {
        const message = err?.message || 'Upload error';
        setStatus('Upload failed');
        setProgress({ stage: 'error', percentage: 0 });
        showToast(message, 'error');
      } finally {
        setIsUploading(false);
      }
    },
    [activeProjectId, apiBase, showToast]
  );

  const handleGenerate = useCallback(async () => {
    if (!activeProjectId) {
      showToast('Select or create a project first.', 'error');
      return;
    }

    const payload = {
      title: title.trim() || undefined,
      rawContent: rawContent.trim(),
      contentType,
      file_count: lastUploadMeta.fileCount || undefined,
    };

    if (!payload.rawContent) {
      showToast('Please add some content first.', 'error');
      return;
    }

    clearTimers();
    setIsGenerating(true);
    setStatus('Generating documentation...');
    setOutput('Generating document...');
    setPdfLink('');
    setPdfInfo('');
    setSummary('');
    setProgress({ stage: 'generating', percentage: 0 });

    const genId = Date.now();
    const draftTitle = payload.title || 'Untitled Document';

    // Progressive UI updates
    const step1 = setTimeout(() => {
      setOutput(`# ${draftTitle}`);
      setProgress({ stage: 'generating', percentage: 10 });
    }, 200);
    const step2 = setTimeout(() => {
      setOutput(`# ${draftTitle}\n\n## Table of Contents\n1. Overview\n2. Details\n3. Summary`);
      setProgress({ stage: 'generating', percentage: 30 });
    }, 500);
    const step3 = setTimeout(() => {
      setOutput(
        `# ${draftTitle}\n\n## Table of Contents\n1. Overview\n2. Details\n3. Summary\n\n## Overview\nDocument outline is being prepared...\n\n## Details\nCompiling key sections...`
      );
      setProgress({ stage: 'generating', percentage: 50 });
    }, 900);
    timersRef.current = [step1, step2, step3];

    let finalOutput = '';
    let finalPdfPath = '';
    let fileSummary = lastUploadMeta.fileCount;
    let typeSummary = lastUploadMeta.contentType || contentType;
    let statusMessage = 'Done.';
    let toastMessage = 'Documentation generated';
    let toastKind = 'info';

    try {
      setProgress({ stage: 'generating', percentage: 60 });
      const res = await fetch(`${apiBase}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      setProgress({ stage: 'generating', percentage: 80 });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      finalOutput = data.output || data.docText || '';
      finalPdfPath = data.pdfPath || data.pdfUrl || '';
      fileSummary = data.file_count || lastUploadMeta.fileCount;
      typeSummary = data.content_type || lastUploadMeta.contentType || contentType;
      setProgress({ stage: 'generating', percentage: 95 });
    } catch (err) {
      finalOutput = buildFallbackOutput(payload.rawContent, payload.title);
      statusMessage = 'Backend unavailable, used fallback draft.';
      toastMessage = err?.message || 'Backend unavailable, used fallback draft.';
      toastKind = 'error';
    } finally {
      clearTimers();
      setIsGenerating(false);
      setProgress({ stage: 'complete', percentage: 100 });
      setTimeout(() => setProgress({ stage: '', percentage: 0 }), 1500);
    }

    const summaryText = `Generated from ${fileSummary ? `${fileSummary} file(s)` : 'N/A'}, type: ${
      typeSummary || 'text'
    }`;
    setSummary(summaryText);
    setOutput(finalOutput);

    if (finalPdfPath) {
      setPdfLink(finalPdfPath);
      setPdfInfo(`PDF saved on server at ${finalPdfPath}`);
    } else {
      setPdfLink('');
      setPdfInfo('');
    }
    setStatus(statusMessage);
    showToast(toastMessage, toastKind);

    const newGen = {
      id:
        (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : `gen-${Date.now()}`,
      projectId: activeProjectId,
      prompt: payload.rawContent,
      output: finalOutput,
      createdAt: new Date().toISOString(),
      pdfPath: finalPdfPath || undefined,
    };

    setAllGenerations((prev) => {
      const next = [...prev, newGen];
      saveGenerations(next);
      return next;
    });
  }, [activeProjectId, apiBase, clearTimers, contentType, lastUploadMeta, rawContent, showToast, title]);

  return {
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
    actions: {
      setTitle,
      setContentType,
      setRawContent,
      handleUpload,
      handleGenerate,
      showToast,
    },
  };
};

export default useCode2Doc;
