import { useCallback } from 'react';

const getApiBase = () => {
  if (typeof window === 'undefined') return 'http://localhost:5001';
  const envApi = process.env.REACT_APP_API_BASE_URL;
  if (envApi) return envApi;
  return window.location.port === '3000' || !window.location.port
    ? 'http://localhost:5001'
    : window.location.origin;
};

/**
 * Hook for tracking and checking usage limits
 */
const useUsageTracking = () => {
  const checkUsage = useCallback(async () => {
    try {
      const response = await fetch(`${getApiBase()}/api/user/usage`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to check usage:', error);
      return null;
    }
  }, []);

  const incrementUsage = useCallback(async (type, amount = 1) => {
    try {
      const response = await fetch(`${getApiBase()}/api/user/usage/increment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, amount }),
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to increment usage:', error);
      return false;
    }
  }, []);

  const canCreateBot = useCallback(async () => {
    const usage = await checkUsage();
    if (!usage) return true; // Allow if check fails
    return usage.bots.current < usage.bots.limit;
  }, [checkUsage]);

  const canChat = useCallback(async () => {
    const usage = await checkUsage();
    if (!usage) return true;
    return usage.chats.today < usage.chats.limit;
  }, [checkUsage]);

  const canGenerateDoc = useCallback(async () => {
    const usage = await checkUsage();
    if (!usage) return true;
    return usage.codeToDoc.used < usage.codeToDoc.limit;
  }, [checkUsage]);

  const canUseTokens = useCallback(async (tokens) => {
    const usage = await checkUsage();
    if (!usage) return true;
    return (usage.tokens.used + tokens) <= usage.tokens.limit;
  }, [checkUsage]);

  return {
    checkUsage,
    incrementUsage,
    canCreateBot,
    canChat,
    canGenerateDoc,
    canUseTokens,
  };
};

export default useUsageTracking;

