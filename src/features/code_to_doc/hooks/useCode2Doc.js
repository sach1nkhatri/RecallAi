import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { loadUploads, saveUploads } from './projectStorage';

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

// Removed fallback output - we want real documentation or proper errors

const useCode2Doc = (activeProjectId = null) => {
  const apiBase = useMemo(getApiBase, []);
  const [fileInfo, setFileInfo] = useState('');
  const [output, setOutput] = useState('Generated documentation will appear here.');
  const [pdfLink, setPdfLink] = useState('');
  const [pdfInfo, setPdfInfo] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const timersRef = useRef([]);
  const [summary, setSummary] = useState('');
  const [lastUploadMeta, setLastUploadMeta] = useState({ fileCount: null, contentType: null });
  const [allUploads, setAllUploads] = useState(() => loadUploads());
  const [uploads, setUploads] = useState([]);
  const [apiHealth, setApiHealth] = useState({ status: 'unknown', lastCheck: null });
  const [repoInfo, setRepoInfo] = useState(null);

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
      return;
    }
    setUploads(allUploads.filter((item) => item.projectId === activeProjectId));
  }, [activeProjectId, allUploads]);

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

      try {
        const res = await fetch(`${apiBase}/api/upload`, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        const extractedContent = data.content || '';
        setRawContent(extractedContent);
        setLastUploadMeta({
          fileCount: data.file_count || null,
          contentType: data.content_type || null,
        });
        setSummary('');

        const label = data.file_count
          ? `${data.file_count} file(s): ${data.filename}`
          : data.filename || 'files loaded';

        setFileInfo(`Loaded ${label} (${data.content_type})`);

        if (data.skipped && data.skipped.length) {
          showToast(`Skipped unsupported: ${data.skipped.join(', ')}`, 'error');
        } else {
          showToast(`Successfully loaded ${data.file_count || 1} file(s). Ready to generate.`, 'info');
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
      } catch (err) {
        const message = err?.message || 'Upload error';
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

    // Check code-to-doc usage limit
    try {
      const usageResponse = await fetch(`${apiBase}/api/user/usage`);
      if (usageResponse.ok) {
        const usage = await usageResponse.json();
        if (usage.codeToDoc.used >= usage.codeToDoc.limit) {
          showToast(`Code to Doc limit reached. Free plan allows ${usage.codeToDoc.limit} uses. Upgrade for more.`, 'error');
          return;
        }
      }
    } catch (err) {
      console.error('Failed to check usage:', err);
    }

    // Only allow generation from file uploads (file_count required)
    if (!lastUploadMeta.fileCount || lastUploadMeta.fileCount < 1) {
      showToast('Please upload files first. Direct text mode is not supported.', 'error');
      return;
    }

    if (!rawContent || !rawContent.trim()) {
      showToast('No content available. Please upload files first.', 'error');
      return;
    }

    clearTimers();
    setIsGenerating(true);
    setOutput('Generated documentation will appear here.');
    setPdfLink('');
    setPdfInfo('');
    setSummary('');

    let finalOutput = '';
    let finalPdfPath = '';
      let fileSummary = lastUploadMeta.fileCount;
      let typeSummary = lastUploadMeta.contentType || 'code';
    let toastMessage = 'Documentation generated successfully';
    let toastKind = 'info';

    try {
      const res = await fetch(`${apiBase}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errorData.error || `Generation failed with status ${res.status}`);
      }
      
      const data = await res.json();
      finalOutput = data.output || data.docText || '';
      
      if (!finalOutput || finalOutput.trim().length < 50) {
        throw new Error('Generated documentation is too short or empty. Please try again.');
      }
      
      finalPdfPath = data.pdfPath || data.pdfUrl || '';
      fileSummary = data.file_count || lastUploadMeta.fileCount;
      typeSummary = data.content_type || lastUploadMeta.contentType || 'code';
    } catch (err) {
      console.error('Documentation generation error:', err);
      finalOutput = `# Error Generating Documentation\n\n**Error:** ${err?.message || 'Failed to generate documentation. Please check your connection and try again.'}\n\nPlease ensure:\n- Your files were uploaded successfully\n- The backend server is running\n- LM Studio is connected and running\n- Your content is valid and readable`;
      toastMessage = err?.message || 'Failed to generate documentation. Please check your connection and try again.';
      toastKind = 'error';
    } finally {
      clearTimers();
      setIsGenerating(false);
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
    showToast(toastMessage, toastKind);

    // Note: History saving disabled until auth is implemented
    // Increment usage after successful generation
    try {
      // Estimate tokens (rough: 1 token ≈ 4 characters)
      const estimatedTokens = Math.ceil(finalOutput.length / 4);
      
      // Check token limit
      const usageResponse = await fetch(`${apiBase}/api/user/usage`);
      if (usageResponse.ok) {
        const usage = await usageResponse.json();
        if ((usage.tokens.used + estimatedTokens) > usage.tokens.limit) {
          showToast(`Token limit would be exceeded. Free plan allows ${usage.tokens.limit.toLocaleString()} tokens.`, 'error');
          return;
        }
      }

      // Increment code-to-doc and token usage
      await fetch(`${apiBase}/api/user/usage/increment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'codeToDoc', amount: 1 }),
      });
      
      await fetch(`${apiBase}/api/user/usage/increment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'tokens', amount: estimatedTokens }),
      });
    } catch (err) {
      console.error('Failed to update usage:', err);
    }
  }, [activeProjectId, apiBase, clearTimers, lastUploadMeta, rawContent, showToast]);

  const handleRepoIngest = useCallback(async (repoUrl) => {
    if (!activeProjectId) {
      showToast('Select or create a project first.', 'error');
      return null;
    }

    setIsIngesting(true);
    setRepoInfo(null);

    try {
      const res = await fetch(`${apiBase}/api/repo/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Repository ingestion failed');
      }

      setRepoInfo({
        repo_id: data.repo_id,
        owner: data.owner,
        repo_name: data.repo_name,
        total_files: data.total_files,
        total_chars: data.total_chars,
        warnings: data.warnings || [],
      });

      showToast(
        `Repository ingested: ${data.total_files} files included. ${data.warnings?.length || 0} warnings.`,
        'info'
      );

      return data;
    } catch (err) {
      const message = err?.message || 'Repository ingestion failed';
      showToast(message, 'error');
      return null;
    } finally {
      setIsIngesting(false);
    }
  }, [activeProjectId, apiBase, showToast]);

  const handleRepoGenerate = useCallback(async (repoUrl, repoId) => {
    if (!activeProjectId) {
      showToast('Select or create a project first.', 'error');
      return;
    }

    if (!repoId) {
      showToast('Please ingest the repository first.', 'error');
      return;
    }

    // Check usage limits
    try {
      const usageResponse = await fetch(`${apiBase}/api/user/usage`);
      if (usageResponse.ok) {
        const usage = await usageResponse.json();
        if (usage.codeToDoc.used >= usage.codeToDoc.limit) {
          showToast(`Code to Doc limit reached. Free plan allows ${usage.codeToDoc.limit} uses.`, 'error');
          return;
        }
      }
    } catch (err) {
      console.error('Failed to check usage:', err);
    }

    clearTimers();
    setIsGenerating(true);
    setOutput('Generating documentation from repository...');
    setPdfLink('');
    setPdfInfo('');
    setSummary('');

    try {
      const res = await fetch(`${apiBase}/api/repo/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_url: repoUrl,
          repo_id: repoId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errorData.error || `Generation failed with status ${res.status}`);
      }

      const data = await res.json();
      const finalOutput = data.output || data.docText || '';

      if (!finalOutput || finalOutput.trim().length < 50) {
        throw new Error('Generated documentation is too short or empty. Please try again.');
      }

      const finalPdfPath = data.pdfPath || data.pdfUrl || '';
      const repoInfo = data.repo_info || {};

      setSummary(
        `Generated from ${repoInfo.repo_name || 'repository'} ` +
        `(${repoInfo.total_files || 0} files, ${data.duration_seconds || 0}s)`
      );
      setOutput(finalOutput);

      if (finalPdfPath) {
        setPdfLink(finalPdfPath);
        setPdfInfo(`PDF saved: ${finalPdfPath}`);
      }

      showToast('Documentation generated successfully!', 'info');

      // Update usage
      try {
        const estimatedTokens = Math.ceil(finalOutput.length / 4);
        await fetch(`${apiBase}/api/user/usage/increment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'codeToDoc', amount: 1 }),
        });
        await fetch(`${apiBase}/api/user/usage/increment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'tokens', amount: estimatedTokens }),
        });
      } catch (err) {
        console.error('Failed to update usage:', err);
      }
    } catch (err) {
      console.error('Repository documentation generation error:', err);
      setOutput(
        `# Error Generating Documentation\n\n**Error:** ${err?.message || 'Failed to generate documentation.'}\n\n` +
        `Please ensure:\n- The repository is public\n- The backend server is running\n- LM Studio is connected\n- The repository contains valid code files`
      );
      showToast(err?.message || 'Failed to generate documentation.', 'error');
    } finally {
      clearTimers();
      setIsGenerating(false);
    }
  }, [activeProjectId, apiBase, clearTimers, showToast]);

  return {
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
  };
};

export default useCode2Doc;
