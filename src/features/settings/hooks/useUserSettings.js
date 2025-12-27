import { useState, useEffect, useCallback } from 'react';

import { getNodeApiBase, nodeApiRequest } from '../../../core/utils/nodeApi';

const getApiBase = getNodeApiBase;

const useUserSettings = () => {
  const [user, setUser] = useState(null);
  const [usage, setUsage] = useState({
    bots: { current: 0, limit: 1 },
    chats: { today: 0, limit: 10 },
    codeToDoc: { used: 0, limit: 2 },
    tokens: { used: 0, limit: 5000 },
  });
  const [settings, setSettings] = useState(null);
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

      // Load usage stats from Node backend
      try {
        const usageData = await nodeApiRequest('/api/users/usage');
        if (usageData.success && usageData.usage) {
          setUsage(usageData.usage);
        }
      } catch (err) {
        console.error('Failed to load usage:', err);
      }

      // Load user settings from Node backend
      try {
        const settingsData = await nodeApiRequest('/api/settings');
        if (settingsData.success && settingsData.settings) {
          setSettings(settingsData.settings);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
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
      const updated = await nodeApiRequest('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(userData),
      });

      if (updated.success && updated.user) {
        setUser(updated.user);
        
        // Update localStorage
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...currentUser, ...updated.user }));
        
        // Update auth context
        const auth = JSON.parse(localStorage.getItem('auth') || '{}');
        if (auth.user) {
          auth.user = { ...auth.user, ...updated.user };
          localStorage.setItem('auth', JSON.stringify(auth));
        }
        
        return updated.user;
      } else {
        throw new Error(updated.error || 'Failed to update profile');
      }
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
      const result = await nodeApiRequest('/api/users/account', {
        method: 'DELETE',
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete account');
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

  const updateSettings = useCallback(async (settingsData) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await nodeApiRequest('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settingsData),
      });

      if (result.success && result.settings) {
        setSettings(result.settings);
        return result.settings;
      } else {
        throw new Error(result.error || 'Failed to update settings');
      }
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
    settings,
    plan,
    isLoading,
    error,
    updateUser,
    updateSettings,
    deleteAllBots,
    deleteAllCodeToDocHistory,
    deleteAccount,
    refreshSettings: loadUserSettings,
  };
};

export default useUserSettings;

