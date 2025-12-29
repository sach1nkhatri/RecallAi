import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import useGenerationStatus from './useGenerationStatus';
import { nodeApiRequest, getAuthToken } from '../../../core/utils/nodeApi';

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

const useCode2Doc = () => {
  const apiBase = useMemo(getApiBase, []);
  const { updateStatus, status: generationStatus } = useGenerationStatus();
  
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
  const [lastUploadMeta, setLastUploadMeta] = useState({ fileCount: null, contentType: null, rawContent: null });
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

  // Clear repoInfo when component unmounts (session-based)
  useEffect(() => {
    return () => {
      setRepoInfo(null);
    };
  }, []);

  const handleUpload = useCallback(
    async (files) => {
      if (!files || files.length === 0) {
        showToast('Please choose file(s) first.', 'error');
        return;
      }

      const formData = new FormData();
      files.forEach((file) => formData.append('file', file));

      setIsUploading(true);

      // Get auth token for upload
      const token = getAuthToken();
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      try {
        const res = await fetch(`${apiBase}/api/upload`, {
          method: 'POST',
          headers: headers,
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        setLastUploadMeta({
          fileCount: data.file_count || null,
          contentType: data.content_type || null,
          rawContent: data.content || null, // Store the actual file content
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
          name: file.name,
          size: file.size,
          type: file.type || 'unknown',
          uploadedAt: now,
        }));

        setUploads((prev) => [...prev, ...newUploads]);
      } catch (err) {
        const message = err?.message || 'Upload error';
        showToast(message, 'error');
      } finally {
        setIsUploading(false);
      }
    },
    [apiBase, showToast]
  );

  const handleGenerate = useCallback(async () => {

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

    // Ensure we have the content from upload
    if (!lastUploadMeta.rawContent) {
      showToast('File content not available. Please upload files again.', 'error');
      return;
    }

    clearTimers();
    setIsGenerating(true);
    setOutput('Generated documentation will appear here.');
    setPdfLink('');
    setPdfInfo('');
    setSummary('');

    // Initialize generation status (optional - won't break if auth fails)
    try {
      const statusResult = await updateStatus({
        type: 'file_upload',
        status: 'pending',
        progress: 0,
        currentStep: 'Starting generation...',
        fileCount: uploads.length,
      });
      if (!statusResult) {
        console.log('Generation status tracking skipped (authentication required)');
      }
    } catch (err) {
      // Don't block generation if status tracking fails
      console.warn('Generation status tracking unavailable:', err.message);
    }

    let finalOutput = '';
    let finalPdfPath = '';
      let fileSummary = lastUploadMeta.fileCount;
      let typeSummary = lastUploadMeta.contentType || 'code';
    let toastMessage = 'Documentation generated successfully';
    let toastKind = 'info';

    try {
      const payload = {
        rawContent: lastUploadMeta.rawContent, // Send the actual file content
        contentType: lastUploadMeta.contentType || 'code',
        file_count: lastUploadMeta.fileCount,
      };
      
      // Update status: generating (optional)
      try {
        await updateStatus({
          status: 'generating',
          progress: 30,
          currentStep: 'Generating documentation from files...',
        });
      } catch (err) {
        // Don't block generation if status update fails
        console.warn('Status update skipped:', err.message);
      }

      // Get auth token for status reporting
      const token = getAuthToken();
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Add timeout to prevent hanging (120 seconds = 2 minutes)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds

      const res = await fetch(`${apiBase}/api/generate`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
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
      
      // Handle timeout/abort errors
      if (err.name === 'AbortError' || err.message?.includes('timeout')) {
        toastMessage = 'Generation timed out. The request took too long. Please try with smaller files or check LM Studio connection.';
      } else {
        toastMessage = err?.message || 'Failed to generate documentation. Please check your connection and try again.';
      }
      
      finalOutput = `# Error Generating Documentation\n\n**Error:** ${toastMessage}\n\nPlease ensure:\n- Your files were uploaded successfully\n- The backend server is running\n- LM Studio is connected and running\n- Your content is valid and readable\n- The model is loaded in LM Studio`;
      toastKind = 'error';
    } finally {
      clearTimers();
      setIsGenerating(false);
      
      // Update final status (optional)
      try {
        if (finalOutput && !finalOutput.includes('# Error')) {
          await updateStatus({
            status: 'completed',
            progress: 100,
            currentStep: 'Completed',
            markdown: finalOutput,
            pdfUrl: finalPdfPath,
            pdfInfo: finalPdfPath ? { filename: finalPdfPath.split('/').pop() } : undefined,
          });
        } else {
          await updateStatus({
            status: 'failed',
            error: { message: toastMessage || 'Generation failed' },
          });
        }
      } catch (err) {
        // Don't block if status update fails
        console.warn('Final status update skipped:', err.message);
      }
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

    // Usage is now checked and incremented by the Python backend
  }, [apiBase, clearTimers, lastUploadMeta, showToast, updateStatus, uploads.length]);

  const handleRepoIngest = useCallback(async (repoUrl) => {
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
  }, [apiBase, showToast]);

  const handleRepoGenerate = useCallback(async (repoUrl, repoId) => {
    if (!repoId) {
      showToast('Please ingest the repository first.', 'error');
      return;
    }

    // Usage limits are checked on the backend
    clearTimers();
    setIsGenerating(true);
    setOutput('Generating documentation from repository...');
    setPdfLink('');
    setPdfInfo('');
    setSummary('');

    // Initialize generation status
    try {
      await updateStatus({
        type: 'github_repo',
        status: 'pending',
        progress: 0,
        currentStep: 'Starting repository documentation generation...',
        repoUrl: repoUrl,
        repoId: repoId,
        repoInfo: repoInfo ? {
          totalFiles: repoInfo.total_files,
          includedFiles: repoInfo.total_files,
        } : undefined,
      });
    } catch (err) {
      console.error('Failed to initialize status:', err);
    }

    // Declare variables outside try block so they're accessible in finally
    let finalOutput = '';
    let finalPdfPath = '';
    let generationError = null;

    // Get auth token for status reporting
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${apiBase}/api/repo/generate`, {
        method: 'POST',
        headers: headers,
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
      finalOutput = data.output || data.docText || '';

      if (!finalOutput || finalOutput.trim().length < 50) {
        throw new Error('Generated documentation is too short or empty. Please try again.');
      }

      finalPdfPath = data.pdfPath || data.pdfUrl || '';
      const repoInfoData = data.repo_info || {};

      setSummary(
        `Generated from ${repoInfoData.repo_name || 'repository'} ` +
        `(${repoInfoData.total_files || 0} files, ${data.duration_seconds || 0}s)`
      );
      setOutput(finalOutput);

      if (finalPdfPath) {
        setPdfLink(finalPdfPath);
        setPdfInfo(`PDF saved: ${finalPdfPath}`);
      }

      showToast('Documentation generated successfully!', 'info');

      // Usage is now incremented by the Python backend after successful generation
    } catch (err) {
      console.error('Repository documentation generation error:', err);
      generationError = err;
      setOutput(
        `# Error Generating Documentation\n\n**Error:** ${err?.message || 'Failed to generate documentation.'}\n\n` +
        `Please ensure:\n- The repository is public\n- The backend server is running\n- LM Studio is connected\n- The repository contains valid code files`
      );
      showToast(err?.message || 'Failed to generate documentation.', 'error');
    } finally {
      clearTimers();
      setIsGenerating(false);
      
      // Update status to completed or failed (optional)
      try {
        if (finalOutput && !finalOutput.includes('# Error')) {
          await updateStatus({
            status: 'completed',
            progress: 100,
            currentStep: 'Completed',
            markdown: finalOutput,
            pdfUrl: finalPdfPath,
            pdfInfo: finalPdfPath ? { filename: finalPdfPath.split('/').pop() } : undefined,
          });
        } else {
          await updateStatus({
            status: 'failed',
            error: { message: generationError?.message || 'Generation failed' },
          });
        }
      } catch (statusErr) {
        // Don't block if status update fails
        console.warn('Final status update skipped:', statusErr.message);
      }
    }
  }, [apiBase, clearTimers, showToast, updateStatus, repoInfo]);

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
