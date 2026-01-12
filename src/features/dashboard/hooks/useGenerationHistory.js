import { useState, useEffect, useCallback } from 'react';
import { nodeApiRequest } from '../../../core/utils/nodeApi';

/**
 * Hook to fetch and manage code-to-doc generation history
 */
const useGenerationHistory = () => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const fetchHistory = useCallback(async (page = 1, limit = 10) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await nodeApiRequest(`/api/generation-status/history?page=${page}&limit=${limit}`);
      if (data.success) {
        setHistory(data.statuses || []);
        setPagination(data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
        });
      }
    } catch (err) {
      console.error('Failed to fetch generation history:', err);
      setError(err.message);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(1, 10);
  }, [fetchHistory]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      case 'pending':
      case 'ingesting':
      case 'scanning':
      case 'indexing':
      case 'generating':
      case 'merging':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      case 'ingesting':
        return 'Ingesting';
      case 'scanning':
        return 'Scanning';
      case 'indexing':
        return 'Indexing';
      case 'generating':
        return 'Generating';
      case 'merging':
        return 'Merging';
      default:
        return status;
    }
  };

  return {
    history,
    isLoading,
    error,
    pagination,
    fetchHistory,
    formatDate,
    getStatusColor,
    getStatusLabel,
  };
};

export default useGenerationHistory;

