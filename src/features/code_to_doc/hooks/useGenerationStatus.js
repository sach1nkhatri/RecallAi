/**
 * Hook for tracking code-to-doc generation status
 * Uses Server-Sent Events (SSE) for real-time status updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { nodeApiRequest, getNodeApiBase, getAuthToken } from '../../../core/utils/nodeApi';

const useGenerationStatus = () => {
  const [status, setStatus] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const streamControllerRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds

  // Stop SSE connection
  const stopConnection = useCallback(() => {
    if (streamControllerRef.current) {
      console.log('🔌 Closing SSE connection');
      streamControllerRef.current.abort();
      streamControllerRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  // Start SSE connection for real-time updates
  const startConnectionRef = useRef(null);
  
  const startConnection = useCallback(() => {
    // Don't start if already connected
    if (streamControllerRef.current && !streamControllerRef.current.signal.aborted) {
      console.log('ℹ️ SSE connection already active');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      console.warn('⚠️ No auth token, cannot establish SSE connection');
      // Fallback to localStorage
      const savedStatus = localStorage.getItem('generationStatus');
      if (savedStatus) {
        try {
          const parsed = JSON.parse(savedStatus);
          if (parsed && ['pending', 'ingesting', 'scanning', 'indexing', 'generating', 'merging'].includes(parsed.status)) {
            setStatus(parsed);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      return;
    }

    const apiBase = getNodeApiBase();
    const url = `${apiBase}/api/generation-status/stream`;
    
    console.log('🔌 Opening SSE connection to:', url);
    
    const controller = new AbortController();
    streamControllerRef.current = controller;
    
    // Helper function to schedule reconnection
    const scheduleReconnect = () => {
      const savedStatus = localStorage.getItem('generationStatus');
      if (savedStatus) {
        try {
          const parsed = JSON.parse(savedStatus);
          if (parsed && ['pending', 'ingesting', 'scanning', 'indexing', 'generating', 'merging'].includes(parsed.status)) {
            if (reconnectAttemptsRef.current < maxReconnectAttempts) {
              reconnectAttemptsRef.current += 1;
              const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1);
              console.log(`🔄 Scheduling SSE reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms`);
              reconnectTimeoutRef.current = setTimeout(() => {
                if (startConnectionRef.current) {
                  startConnectionRef.current();
                }
              }, delay);
            } else {
              console.error('❌ Max reconnection attempts reached');
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    };
    
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      signal: controller.signal,
    }).then(response => {
      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
      
      const readStream = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            console.log('📡 SSE stream ended');
            setIsConnected(false);
            scheduleReconnect();
            return;
          }
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.trim() === '') continue;
            
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.success && data.status) {
                  console.log('📥 Real-time status update:', data.status.status, `(${data.status.progress}%)`, data.status.currentStep);
                  setStatus(data.status);
                  
                  // Stop connection if completed or failed
                  if (['completed', 'failed'].includes(data.status.status)) {
                    console.log('✅ Generation finished, closing SSE connection');
                    controller.abort();
                    setIsConnected(false);
                    return;
                  }
                } else if (data.success && data.status === null) {
                  // No active generation
                  setStatus(null);
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', e, line);
              }
            } else if (line.startsWith(': heartbeat')) {
              // Heartbeat received, connection is alive
              // console.debug('💓 Heartbeat received');
            }
          }
          
          readStream();
        }).catch(error => {
          if (error.name === 'AbortError') {
            console.log('🔌 SSE connection aborted');
          } else {
            console.error('❌ SSE read error:', error);
            setIsConnected(false);
            scheduleReconnect();
          }
        });
      };
      
      readStream();
    }).catch(error => {
      if (error.name === 'AbortError') {
        console.log('🔌 SSE connection aborted');
        return;
      }
      console.error('❌ Failed to establish SSE connection:', error);
      setIsConnected(false);
      scheduleReconnect();
    });
  }, []);
  
  // Store function in ref to avoid circular dependency
  startConnectionRef.current = startConnection;

  // Load status from backend and localStorage on mount, then start SSE
  useEffect(() => {
    const loadStatus = async () => {
      console.log('🔄 Loading generation status on mount...');
      
      // First try to load from backend (most up-to-date)
      try {
        console.log('📡 Fetching initial status from backend...');
        const data = await nodeApiRequest('/api/generation-status/current', {
          timeout: 10000,
        });
        if (data.success && data.status) {
          console.log('✅ Backend has active status:', data.status.status);
          setStatus(data.status);
        } else {
          console.log('ℹ️ Backend has no active status');
        }
      } catch (error) {
        console.log('⚠️ Backend status check failed, trying localStorage:', error.message);
      }

      // Fallback to localStorage if backend doesn't have status
      const savedStatus = localStorage.getItem('generationStatus');
      if (savedStatus) {
        try {
          const parsed = JSON.parse(savedStatus);
          if (parsed && ['pending', 'ingesting', 'scanning', 'indexing', 'generating', 'merging'].includes(parsed.status)) {
            console.log('✅ Restoring active status from localStorage:', parsed.status);
            setStatus(parsed);
          }
        } catch (error) {
          console.error('❌ Failed to parse saved status:', error);
        }
      }
      
      // Start SSE connection for real-time updates
      startConnection();
    };

    loadStatus();
  }, [startConnection]);

  // Save status to localStorage whenever it changes
  useEffect(() => {
    if (status) {
      try {
        localStorage.setItem('generationStatus', JSON.stringify(status));
      } catch (error) {
        console.error('Failed to save status to localStorage:', error);
      }
    } else {
      localStorage.removeItem('generationStatus');
    }
  }, [status]);

  const updateStatus = useCallback(async (statusData) => {
    // Set status IMMEDIATELY (synchronously) so UI updates right away
    const immediateStatus = {
      ...statusData,
      _id: statusData._id || `temp-${Date.now()}`,
      startedAt: statusData.startedAt || new Date().toISOString(),
    };
    console.log('⚡ Setting status immediately (synchronous):', immediateStatus.status, `(${immediateStatus.progress || 0}%)`);
    setStatus(immediateStatus);
    
    // Start SSE connection if status is active and not already connected
    if (!isConnected && ['pending', 'ingesting', 'scanning', 'indexing', 'generating', 'merging'].includes(immediateStatus.status)) {
      console.log('▶️ Starting SSE connection for active status');
      startConnection();
    }
    
    // Save to localStorage immediately
    try {
      localStorage.setItem('generationStatus', JSON.stringify(immediateStatus));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
    
    // Then try to sync with backend (async, but don't wait)
    try {
      console.log('📤 Syncing status with backend:', statusData.status || statusData.type, `(${statusData.progress || 0}%)`);
      const data = await nodeApiRequest('/api/generation-status', {
        method: 'POST',
        body: JSON.stringify(statusData),
        timeout: 10000, // 10 second timeout for status updates
      });
      if (data.success && data.status) {
        console.log('✅ Status synced with backend:', data.status.status, 'Progress:', data.status.progress, data.status.currentStep);
        // Update with backend response (has real _id, etc.)
        setStatus(data.status);
        return data.status;
      } else {
        console.warn('⚠️ Status update response missing status data:', data);
        return immediateStatus;
      }
    } catch (error) {
      console.error('❌ Failed to sync generation status with backend:', error.message || error);
      // If authentication error, we already have localStorage fallback
      if (error.message && (error.message.includes('401') || error.message.includes('Not authorized') || error.message.includes('token'))) {
        console.warn('⚠️ Authentication required, using localStorage fallback (already set)');
        return immediateStatus;
      }
      // Status is already set, so return it even if backend sync fails
      return immediateStatus;
    }
  }, [isConnected, startConnection]);

  const cancelGeneration = useCallback(async (statusId) => {
    try {
      const data = await nodeApiRequest(`/api/generation-status/${statusId}`, {
        method: 'DELETE',
      });
      if (data.success) {
        setStatus(null);
        stopConnection();
        return true;
      }
    } catch (error) {
      console.error('Failed to cancel generation:', error);
      throw error;
    }
  }, [stopConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopConnection();
    };
  }, [stopConnection]);

  return {
    status,
    isPolling: isConnected, // Keep same API for backward compatibility
    fetchStatus: async () => {
      // Fallback fetch for compatibility
      try {
        const data = await nodeApiRequest('/api/generation-status/current', { timeout: 10000 });
        if (data.success && data.status) {
          setStatus(data.status);
          return data.status;
        }
      } catch (error) {
        console.error('Failed to fetch status:', error);
      }
      return null;
    },
    updateStatus,
    startPolling: startConnection, // Keep same API for backward compatibility
    stopPolling: stopConnection, // Keep same API for backward compatibility
    cancelGeneration,
  };
};

export default useGenerationStatus;
