import { useState, useEffect, useCallback } from 'react';

const getApiBase = () => {
  if (typeof window === 'undefined') return 'http://localhost:5001';
  const envApi = process.env.REACT_APP_API_BASE_URL;
  if (envApi) return envApi;
  return window.location.port === '3000' || !window.location.port
    ? 'http://localhost:5001'
    : window.location.origin;
};

const useUserSettings = () => {
  const [user, setUser] = useState(null);
  const [usage, setUsage] = useState({
    bots: { current: 0, limit: 1 },
    chats: { today: 0, limit: 10 },
    codeToDoc: { used: 0, limit: 2 },
    tokens: { used: 0, limit: 5000 },
  });
  const [plan, setPlan] = useState('free');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadUserSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load user data from localStorage or API
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setPlan(userData.plan || 'free');
      }

      // Load usage stats
      const usageResponse = await fetch(`${getApiBase()}/api/user/usage`);
      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        setUsage(usageData);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserSettings();
  }, [loadUserSettings]);

  const updateUser = useCallback(async (userData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${getApiBase()}/api/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updated = await response.json();
      setUser(updated.user);
      
      // Update localStorage
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...currentUser, ...updated.user }));
      
      return updated.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteAllBots = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${getApiBase()}/api/user/bots`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete bots');
      }

      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteAllCodeToDocHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${getApiBase()}/api/user/code-to-doc/history`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete history');
      }

      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${getApiBase()}/api/user/account`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      // Clear localStorage
      localStorage.clear();
      
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    user,
    usage,
    plan,
    isLoading,
    error,
    updateUser,
    deleteAllBots,
    deleteAllCodeToDocHistory,
    deleteAccount,
    refreshSettings: loadUserSettings,
  };
};

export default useUserSettings;

