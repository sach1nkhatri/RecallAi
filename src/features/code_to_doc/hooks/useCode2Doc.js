import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import useGenerationStatus from './useGenerationStatus';
import { nodeApiRequest, getAuthToken, getNodeApiBase } from '../../../core/utils/nodeApi';

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
  const { updateStatus, status: generationStatus, startPolling, clearStatus } = useGenerationStatus();
  
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
  const [lastUploadMeta, setLastUploadMeta] = useState({ fileCount: null, contentType: null, rawContent: null, isZip: false, repoFiles: null });
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const res = await fetch(`${apiBase}/api/health`, { 
          method: 'GET',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        let data;
        try {
          data = await res.json();
        } catch (parseErr) {
          console.warn('Failed to parse health check response:', parseErr);
          setApiHealth((prev) => {
            if (prev.status === 'unknown') return prev;
            return { status: 'unknown', lastCheck: new Date(), data: null };
          });
          return;
        }
        
        const newStatus = data.status === 'ok' ? 'healthy' : 'unhealthy';
        // Only update if status actually changed to prevent unnecessary re-renders
        setApiHealth((prev) => {
          if (prev.status === newStatus) return prev;
          return { status: newStatus, lastCheck: new Date(), data };
        });
      } catch (err) {
        // Don't log timeout errors - they're expected if server is down
        if (err.name !== 'AbortError') {
          console.warn('Health check failed:', err.message);
        }
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for upload

        const res = await fetch(`${apiBase}/api/upload`, {
          method: 'POST',
          headers: headers,
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        let data;
        try {
          data = await res.json();
        } catch (parseErr) {
          throw new Error(`Failed to parse upload response: ${parseErr.message}`);
        }
        if (!res.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        setLastUploadMeta({
          fileCount: data.file_count || null,
          contentType: data.content_type || null,
          rawContent: data.content || null,
          isZip: data.is_zip || false,
          repoFiles: data.repo_files || null,
        });
        setSummary('');

        const label = data.file_count
          ? `${data.file_count} file(s): ${data.filename}`
          : data.filename || 'files loaded';

        if (data.is_zip) {
          setFileInfo(`Loaded zip archive: ${label} (${data.file_count} files extracted)`);
          if (data.warnings && data.warnings.length > 0) {
            showToast(`Zip extracted: ${data.file_count} files. ${data.warnings.length} warning(s).`, 'info');
          } else {
            showToast(`Successfully extracted zip: ${data.file_count} files. Ready to generate.`, 'info');
          }
        } else {
          setFileInfo(`Loaded ${label} (${data.content_type})`);
          if (data.skipped && data.skipped.length) {
            showToast(`Skipped unsupported: ${data.skipped.join(', ')}`, 'error');
          } else {
            showToast(`Successfully loaded ${data.file_count || 1} file(s). Ready to generate.`, 'info');
          }
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
      const usageController = new AbortController();
      const usageTimeoutId = setTimeout(() => usageController.abort(), 10000); // 10 second timeout
      
      const usageResponse = await fetch(`${apiBase}/api/user/usage`, {
        signal: usageController.signal,
      });
      
      clearTimeout(usageTimeoutId);
      
      if (usageResponse.ok) {
        let usage;
        try {
          usage = await usageResponse.json();
        } catch (parseErr) {
          console.warn('Failed to parse usage response:', parseErr);
          // Continue without usage check if parsing fails
          usage = { codeToDoc: { used: 0, limit: Infinity } };
        }
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

    // Handle zip file uploads - use RAG pipeline like GitHub repos
    if (lastUploadMeta.isZip && lastUploadMeta.repoFiles) {
      // Use the same flow as GitHub repos for zip files
      const zipRepoId = `zip_upload_${Date.now()}`;
      return handleRepoGenerate(`zip://${zipRepoId}`, zipRepoId, lastUploadMeta.repoFiles);
    }

    // Ensure we have the content from upload (for regular files)
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

    // CRITICAL: Clear any old statuses (both frontend state and backend) before starting new generation
    // This ensures a completely fresh start with no old snapshots
    console.log('Clearing all old statuses before starting new generation...');
    
    // Clear from hook state and localStorage immediately (synchronous)
    if (clearStatus) {
      clearStatus(); // This clears state immediately
    } else {
      // Fallback: clear localStorage manually
      localStorage.removeItem('generationStatus');
    }
    
    // Also clear from backend (async, but don't wait - we want to start immediately)
    // This prevents old snapshots from showing up
    (async () => {
      try {
        const token = getAuthToken();
        if (token) {
          // Try to get current status and delete it if exists
          const currentStatusRes = await fetch(`${getNodeApiBase()}/api/generation-status/current`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (currentStatusRes.ok) {
            const currentData = await currentStatusRes.json();
            if (currentData.success && currentData.status && currentData.status._id) {
              // Delete the old status from backend
              await fetch(`${getNodeApiBase()}/api/generation-status/${currentData.status._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
              }).catch(e => console.warn('Failed to delete old status from backend:', e));
            }
          }
        }
      } catch (e) {
        console.warn('Failed to clear backend status (non-critical):', e);
      }
    })();

    // Initialize generation status IMMEDIATELY (synchronous update, async backend sync)
    // This ensures the progress window shows right away with fresh status
    console.log('Starting generation, initializing status tracking...');
    updateStatus({
      type: 'file_upload',
      status: 'pending',
      progress: 0,
      currentStep: 'Starting generation...',
      fileCount: uploads.length,
    }).catch(err => {
      // Don't block generation if status tracking fails
      console.warn('Generation status tracking error (non-blocking):', err.message);
    });

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
        is_zip: false, // Regular file upload
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

      // Add longer timeout for generation (60 minutes = 3600 seconds)
      // Generation can take a while, especially for large files or slow LLM responses
      // Increased from 20 to 60 minutes to handle slow 14B models and large files
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3600000); // 60 minutes

      console.log('Sending generation request to backend...', {
        contentLength: lastUploadMeta.rawContent?.length || 0,
        fileCount: lastUploadMeta.fileCount,
        contentType: lastUploadMeta.contentType
      });

      const res = await fetch(`${apiBase}/api/generate`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        const errorMsg = errorData.error || errorData.message || `Generation failed with status ${res.status}`;
        console.error('Generation request failed:', errorMsg);
        
        // Report error status
        try {
          await updateStatus({
            status: 'failed',
            error: { message: errorMsg },
          });
        } catch (e) {
          console.warn('Failed to report error status:', e);
        }
        
        throw new Error(errorMsg);
      }
      
      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        const errorMsg = `Failed to parse generation response: ${parseErr.message}`;
        console.error('JSON parse error:', errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log('Generation response received:', {
        hasOutput: !!(data.output || data.docText),
        outputLength: (data.output || data.docText || '').length,
        hasPdf: !!(data.pdfPath || data.pdfUrl),
        success: data.success
      });
      
      finalOutput = data.output || data.docText || '';
      
      if (!finalOutput || finalOutput.trim().length < 50) {
        const errorMsg = 'Generated documentation is too short or empty. Please try again.';
        console.error('Generated content too short:', finalOutput.length);
        
        // Report error status
        try {
          await updateStatus({
            status: 'failed',
            error: { message: errorMsg },
          });
        } catch (e) {
          console.warn('Failed to report error status:', e);
        }
        
        throw new Error(errorMsg);
      }
      
      finalPdfPath = data.pdfPath || data.pdfUrl || '';
      fileSummary = data.file_count || lastUploadMeta.fileCount;
      typeSummary = data.content_type || lastUploadMeta.contentType || 'code';
      
      console.log('Generation successful:', {
        outputLength: finalOutput.length,
        pdfPath: finalPdfPath,
        fileCount: fileSummary
      });
    } catch (err) {
      console.error('Documentation generation error:', err);
      
      // Handle timeout/abort errors with better messages
      if (err.name === 'AbortError' || err.message?.includes('timeout')) {
        toastMessage = 'Generation timed out. The request took too long. This can happen with large files or slow LLM responses. Please try with smaller files, check LM Studio connection, or try again later.';
      } else if (err.message?.includes('fetch') || err.message?.includes('network')) {
        toastMessage = 'Network error. Please check your connection and ensure the backend server is running.';
      } else if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        toastMessage = 'Authentication error. Please log in again.';
      } else if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
        toastMessage = 'Access denied. You may have reached your usage limit.';
      } else {
        toastMessage = err?.message || 'Failed to generate documentation. Please check your connection and try again.';
      }
      
      console.error('Generation error:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      
      // Report error status
      try {
        await updateStatus({
          status: 'failed',
          error: { message: toastMessage },
        });
      } catch (statusErr) {
        console.warn('Failed to report error status:', statusErr);
      }
      
      finalOutput = `# Error Generating Documentation\n\n**Error:** ${toastMessage}\n\nPlease ensure:\n- Your files were uploaded successfully\n- The backend server is running\n- LM Studio is connected and running\n- Your content is valid and readable\n- The model is loaded in LM Studio`;
      toastKind = 'error';
    } finally {
      clearTimers();
      setIsGenerating(false);
      
      // Update final status (CRITICAL - must complete)
      try {
        if (finalOutput && !finalOutput.includes('# Error') && !finalOutput.includes('Error Generating')) {
          console.log('Reporting file upload completion status...');
          await updateStatus({
            status: 'completed',
            progress: 100,
            currentStep: 'Completed',
            markdown: finalOutput,
            pdfUrl: finalPdfPath,
            pdfInfo: finalPdfPath ? { filename: finalPdfPath.split('/').pop() } : undefined,
          });
          console.log('File upload completion status reported');
        } else {
          console.log('Reporting file upload failure status...');
          await updateStatus({
            status: 'failed',
            error: { message: toastMessage || 'Generation failed' },
          });
          console.log('File upload failure status reported');
        }
      } catch (err) {
        // Log but don't block - status update is important
        console.error('Final status update failed:', err.message);
      }
    }

    const summaryText = `Generated from ${fileSummary ? `${fileSummary} file(s)` : 'N/A'}, type: ${
      typeSummary || 'text'
    }`;
    setSummary(summaryText);
    setOutput(finalOutput);
    
    // Ensure status is updated after setting output (double-check)
    if (finalOutput && !finalOutput.includes('# Error') && !finalOutput.includes('Error Generating')) {
      try {
        await updateStatus({
          status: 'completed',
          progress: 100,
          currentStep: 'Completed',
          markdown: finalOutput,
          pdfUrl: finalPdfPath,
          pdfInfo: finalPdfPath ? { filename: finalPdfPath.split('/').pop() } : undefined,
        });
      } catch (e) {
        console.warn('Secondary status update failed:', e);
      }
    }

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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for ingestion
      
      const res = await fetch(`${apiBase}/api/repo/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        throw new Error(`Failed to parse ingestion response: ${parseErr.message}`);
      }
      
      if (!res.ok) {
        throw new Error(data.error || `Repository ingestion failed with status ${res.status}`);
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

  const handleRepoGenerate = useCallback(async (repoUrl, repoId, repoFiles = null) => {
    // If repoFiles provided, it's a zip upload - skip ingestion
    if (!repoFiles && !repoId) {
      showToast('Please ingest the repository first.', 'error');
      return;
    }

    // Usage limits are checked on the backend
    clearTimers();
    setIsGenerating(true);
    setOutput(repoFiles ? 'Generating documentation from zip archive...' : 'Generating documentation from repository...');
    setPdfLink('');
    setPdfInfo('');
    setSummary('');

    // CRITICAL: Clear any old statuses (both frontend state and backend) before starting new generation
    // This ensures a completely fresh start with no old snapshots
    console.log('Clearing all old statuses before starting new repository generation...');
    
    // Clear from hook state and localStorage immediately (synchronous)
    if (clearStatus) {
      clearStatus(); // This clears state immediately
    } else {
      // Fallback: clear localStorage manually
      localStorage.removeItem('generationStatus');
    }
    
    // Also clear from backend (async, but don't wait - we want to start immediately)
    // This prevents old snapshots from showing up
    (async () => {
      try {
        const token = getAuthToken();
        if (token) {
          // Try to get current status and delete it if exists
          const currentStatusRes = await fetch(`${getNodeApiBase()}/api/generation-status/current`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (currentStatusRes.ok) {
            const currentData = await currentStatusRes.json();
            if (currentData.success && currentData.status && currentData.status._id) {
              // Delete the old status from backend
              await fetch(`${getNodeApiBase()}/api/generation-status/${currentData.status._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
              }).catch(e => console.warn('Failed to delete old status from backend:', e));
            }
          }
        }
      } catch (e) {
        console.warn('Failed to clear backend status (non-critical):', e);
      }
    })();

    // Initialize generation status IMMEDIATELY (synchronous update, async backend sync)
    // This ensures the progress window shows right away with fresh status
    console.log('Starting repository generation, initializing status tracking...');
    updateStatus({
      type: repoFiles ? 'zip_upload' : 'github_repo',
      status: 'pending',
      progress: 0,
      currentStep: repoFiles ? 'Starting zip archive documentation generation...' : 'Starting repository documentation generation...',
      repoUrl: repoUrl,
      repoId: repoId,
      repoInfo: repoFiles ? {
        totalFiles: repoFiles.length,
        includedFiles: repoFiles.length,
      } : (repoInfo ? {
        totalFiles: repoInfo.total_files,
        includedFiles: repoInfo.total_files,
      } : undefined),
    }).catch(err => {
      // Don't block generation if status tracking fails
      console.warn('Generation status tracking error (non-blocking):', err.message);
    });

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
      // For zip files, use /api/generate with repo_files
      // For GitHub repos, use /api/repo/generate
      const endpoint = repoFiles ? `${apiBase}/api/generate` : `${apiBase}/api/repo/generate`;
      const payload = repoFiles ? {
        rawContent: '', // Not needed for zip
        contentType: 'code',
        file_count: repoFiles.length,
        is_zip: true,
        repo_files: repoFiles,
      } : {
        repo_url: repoUrl,
        repo_id: repoId,
      };
      
      console.log('Sending repository generation request...', {
        endpoint,
        hasRepoFiles: !!repoFiles,
        repoUrl,
        repoId
      });

      // Add timeout for repo generation (90 minutes for large repos)
      // Repository generation can take longer due to RAG pipeline processing
      // Each chapter can take up to 45 minutes, so repos with multiple chapters need more time
      // Increased from 30 to 90 minutes to handle slow 14B models and large repositories
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5400000); // 90 minutes

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        const errorMsg = errorData.error || errorData.message || `Generation failed with status ${res.status}`;
        console.error('Repository generation failed:', errorMsg);
        
        // Report error status
        try {
          await updateStatus({
            status: 'failed',
            error: { message: errorMsg },
          });
        } catch (e) {
          console.warn('Failed to report error status:', e);
        }
        
        throw new Error(errorMsg);
      }

      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        const errorMsg = `Failed to parse repository generation response: ${parseErr.message}`;
        console.error('JSON parse error:', errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log('Repository generation response:', {
        hasOutput: !!(data.output || data.docText),
        outputLength: (data.output || data.docText || '').length,
        hasPdf: !!(data.pdfPath || data.pdfUrl),
        success: data.success
      });

      finalOutput = data.output || data.docText || '';

      if (!finalOutput || finalOutput.trim().length < 50) {
        const errorMsg = 'Generated documentation is too short or empty. Please try again.';
        console.error('Generated content too short:', finalOutput.length);
        
        // Report error status
        try {
          await updateStatus({
            status: 'failed',
            error: { message: errorMsg },
          });
        } catch (e) {
          console.warn('Failed to report error status:', e);
        }
        
        throw new Error(errorMsg);
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
      console.error('Repository documentation generation error:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      generationError = err;
      
      // Provide better error messages based on error type
      let errorMsg = err?.message || 'Failed to generate documentation.';
      if (err.name === 'AbortError' || err.message?.includes('timeout')) {
        errorMsg = 'Generation timed out. The request took too long. This can happen with large repositories or slow LLM responses. Please try with a smaller repository, check LM Studio connection, or try again later.';
      } else if (err.message?.includes('fetch') || err.message?.includes('network')) {
        errorMsg = 'Network error. Please check your connection and ensure the backend server is running.';
      } else if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        errorMsg = 'Authentication error. Please log in again.';
      } else if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
        errorMsg = 'Access denied. You may have reached your usage limit.';
      }
      
      setOutput(
        `# Error Generating Documentation\n\n**Error:** ${errorMsg}\n\n` +
        `Please ensure:\n- The repository is public\n- The backend server is running\n- LM Studio is connected\n- The repository contains valid code files`
      );
      showToast(errorMsg, 'error');
      
      // Report error status - ensure this happens even if there are errors
      try {
        await updateStatus({
          status: 'failed',
          error: { message: errorMsg },
        });
        console.log('Error status reported to backend');
      } catch (statusErr) {
        console.warn('Failed to report error status (non-critical):', statusErr.message);
        // Don't throw - we want to continue even if status reporting fails
      }
    } finally {
      clearTimers();
      setIsGenerating(false);
      
      // Update status to completed or failed (CRITICAL)
      try {
        if (finalOutput && !finalOutput.includes('# Error') && !finalOutput.includes('Error Generating')) {
          console.log('Reporting repository completion status...');
          await updateStatus({
            status: 'completed',
            progress: 100,
            currentStep: 'Completed',
            markdown: finalOutput,
            pdfUrl: finalPdfPath,
            pdfInfo: finalPdfPath ? { filename: finalPdfPath.split('/').pop() } : undefined,
          });
          console.log('Repository completion status reported');
        } else {
          console.log('Reporting repository failure status...');
          await updateStatus({
            status: 'failed',
            error: { message: generationError?.message || 'Generation failed' },
          });
          console.log('Repository failure status reported');
        }
      } catch (statusErr) {
        // Log but don't block
        console.error('Final status update failed:', statusErr.message);
      }
    }
  }, [apiBase, clearTimers, showToast, updateStatus, repoInfo]);

  // Determine if files are ready for generation
  const isReadyForGeneration = useMemo(() => {
    // For zip files: need isZip flag, repoFiles, and fileCount
    if (lastUploadMeta.isZip) {
      return !!(lastUploadMeta.repoFiles && lastUploadMeta.fileCount && lastUploadMeta.fileCount > 0 && uploads.length > 0);
    }
    // For regular files: need rawContent and fileCount
    return !!(lastUploadMeta.rawContent && lastUploadMeta.fileCount && lastUploadMeta.fileCount > 0 && uploads.length > 0);
  }, [lastUploadMeta, uploads.length]);

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
      rawContent: lastUploadMeta.rawContent || '',
      isReadyForGeneration,
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
