/**
 * Hook for tracking code-to-doc generation status
 * Polls Node backend for status updates and manages background processing
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { nodeApiRequest } from '../../../core/utils/nodeApi';

const POLL_INTERVAL = 3000; // Poll every 3 seconds
const MAX_POLL_TIME = 45 * 60 * 1000; // Stop polling after 45 minutes

const useGenerationStatus = () => {
  const [status, setStatus] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollIntervalRef = useRef(null);
  const pollStartTimeRef = useRef(null);

  // Define stopPolling first (no dependencies)
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
    pollStartTimeRef.current = null;
  }, []);

  // Then define fetchStatus (depends on stopPolling only)
  const fetchStatus = useCallback(async () => {
    try {
      const data = await nodeApiRequest('/api/generation-status/current');
      if (data.success) {
        if (data.status) {
          setStatus(data.status);
          // Stop polling if completed or failed
          if (['completed', 'failed'].includes(data.status.status)) {
            stopPolling();
          }
          return data.status;
        } else {
          // No active generation in backend, but check localStorage
          const savedStatus = localStorage.getItem('generationStatus');
          if (savedStatus) {
            try {
              const parsed = JSON.parse(savedStatus);
              // If localStorage has active status, keep it (might be syncing)
              if (parsed && ['pending', 'ingesting', 'scanning', 'indexing', 'generating', 'merging'].includes(parsed.status)) {
                setStatus(parsed);
                return parsed;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
          setStatus(null);
          stopPolling();
          return null;
        }
      }
    } catch (error) {
      // If authentication error, try localStorage fallback
      if (error.message && (error.message.includes('401') || error.message.includes('Not authorized') || error.message.includes('token'))) {
        console.warn('Authentication required for generation status tracking, using localStorage');
        const savedStatus = localStorage.getItem('generationStatus');
        if (savedStatus) {
          try {
            const parsed = JSON.parse(savedStatus);
            if (parsed && ['pending', 'ingesting', 'scanning', 'indexing', 'generating', 'merging'].includes(parsed.status)) {
              setStatus(parsed);
              return parsed;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        setStatus(null);
        stopPolling();
        return null;
      }
      console.error('Failed to fetch generation status:', error);
      // Don't stop polling on other errors, might be temporary
    }
    return null;
  }, [stopPolling]);

  // Then define startPolling (depends on fetchStatus and stopPolling)
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      return; // Already polling
    }

    setIsPolling(true);
    pollStartTimeRef.current = Date.now();

    // Fetch immediately
    fetchStatus();

    // Then poll at intervals
    pollIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - pollStartTimeRef.current;
      if (elapsed > MAX_POLL_TIME) {
        stopPolling();
        return;
      }
      fetchStatus();
    }, POLL_INTERVAL);
  }, [fetchStatus, stopPolling]);

  // Load status from backend and localStorage on mount (after functions are defined)
  useEffect(() => {
    const loadStatus = async () => {
      console.log('🔄 Loading generation status on mount...');
      
      // First try to load from backend (most up-to-date)
      try {
        console.log('📡 Fetching status from backend...');
        const backendStatus = await fetchStatus();
        if (backendStatus && ['pending', 'ingesting', 'scanning', 'indexing', 'generating', 'merging'].includes(backendStatus.status)) {
          console.log('✅ Backend has active status:', backendStatus.status);
          // Backend has active status, start polling if not already
          if (!pollIntervalRef.current) {
            console.log('▶️ Starting polling for backend status');
            startPolling();
          }
          return;
        } else {
          console.log('ℹ️ Backend has no active status');
        }
      } catch (error) {
        console.log('⚠️ Backend status check failed, trying localStorage:', error.message);
      }

      // Fallback to localStorage if backend doesn't have status
      const savedStatus = localStorage.getItem('generationStatus');
      console.log('💾 Checking localStorage:', savedStatus ? 'Found saved status' : 'No saved status');
      
      if (savedStatus) {
        try {
          const parsed = JSON.parse(savedStatus);
          console.log('📦 Parsed localStorage status:', parsed?.status);
          
          // Only restore if it's still active
          if (parsed && ['pending', 'ingesting', 'scanning', 'indexing', 'generating', 'merging'].includes(parsed.status)) {
            console.log('✅ Restoring active status from localStorage:', parsed.status);
            setStatus(parsed);
            if (!pollIntervalRef.current) {
              console.log('▶️ Starting polling for localStorage status');
              startPolling();
            }
          } else {
            console.log('ℹ️ Saved status is not active:', parsed?.status);
          }
        } catch (error) {
          console.error('❌ Failed to parse saved status:', error);
        }
      }
    };

    loadStatus();
  }, [fetchStatus, startPolling]);

  // Save status to localStorage whenever it changes
  useEffect(() => {
    if (status) {
      try {
        localStorage.setItem('generationStatus', JSON.stringify(status));
        console.log('💾 Saved status to localStorage:', status.status, status.progress + '%');
      } catch (error) {
        console.error('Failed to save status to localStorage:', error);
      }
    } else {
      localStorage.removeItem('generationStatus');
      console.log('🗑️ Removed status from localStorage');
    }
  }, [status]);

  const updateStatus = useCallback(async (statusData) => {
    try {
      console.log('📤 Updating generation status:', statusData.status || statusData.type);
      const data = await nodeApiRequest('/api/generation-status', {
        method: 'POST',
        body: JSON.stringify(statusData),
      });
      if (data.success && data.status) {
        console.log('✅ Status updated successfully:', data.status.status, 'Progress:', data.status.progress);
        setStatus(data.status);
        // Start polling if not already
        if (!pollIntervalRef.current && ['pending', 'ingesting', 'scanning', 'indexing', 'generating', 'merging'].includes(data.status.status)) {
          console.log('▶️ Starting polling after status update');
          startPolling();
        }
        return data.status;
      }
    } catch (error) {
      console.error('❌ Failed to update generation status:', error);
      // If authentication error, save to localStorage as fallback
      if (error.message && (error.message.includes('401') || error.message.includes('Not authorized') || error.message.includes('token'))) {
        console.warn('⚠️ Authentication required, saving to localStorage as fallback');
        // Save to localStorage even if backend fails
        const fallbackStatus = {
          ...statusData,
          _id: `local-${Date.now()}`,
          startedAt: new Date().toISOString(),
        };
        setStatus(fallbackStatus);
        localStorage.setItem('generationStatus', JSON.stringify(fallbackStatus));
        // Start polling for localStorage status
        if (!pollIntervalRef.current && ['pending', 'ingesting', 'scanning', 'indexing', 'generating', 'merging'].includes(statusData.status)) {
          startPolling();
        }
        return fallbackStatus;
      }
      throw error;
    }
  }, [startPolling]);

  const cancelGeneration = useCallback(async (statusId) => {
    try {
      const data = await nodeApiRequest(`/api/generation-status/${statusId}`, {
        method: 'DELETE',
      });
      if (data.success) {
        setStatus(null);
        stopPolling();
        return true;
      }
    } catch (error) {
      console.error('Failed to cancel generation:', error);
      throw error;
    }
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    status,
    isPolling,
    fetchStatus,
    updateStatus,
    startPolling,
    stopPolling,
    cancelGeneration,
  };
};

export default useGenerationStatus;

