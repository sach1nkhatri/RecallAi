import { useState, useEffect, useCallback } from 'react';

const getApiBase = () => {
  if (typeof window === 'undefined') return 'http://localhost:5001';
  const envApi = process.env.REACT_APP_API_BASE_URL;
  if (envApi) return envApi;
  return window.location.port === '3000' || !window.location.port
    ? 'http://localhost:5001'
    : window.location.origin;
};

const useBots = () => {
  const [bots, setBots] = useState([]);
  const [activeBotId, setActiveBotId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadBots = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${getApiBase()}/api/bots`);
      if (response.ok) {
        const data = await response.json();
        setBots(data.bots || []);
      } else {
        throw new Error('Failed to load bots');
      }
    } catch (err) {
      console.error('Failed to load bots:', err);
      setError(err.message);
      setBots([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBots();
  }, [loadBots]);

  const createBot = useCallback(async (botData) => {
    setIsLoading(true);
    setError(null);
    try {
      // Check bot limit
      const usageResponse = await fetch(`${getApiBase()}/api/user/usage`);
      if (usageResponse.ok) {
        const usage = await usageResponse.json();
        if (usage.bots.current >= usage.bots.limit) {
          throw new Error(`Bot limit reached. Free plan allows ${usage.bots.limit} bot(s). Upgrade to create more.`);
        }
      }

      const response = await fetch(`${getApiBase()}/api/bots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(botData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create bot' }));
        throw new Error(error.error || 'Failed to create bot');
      }

      const newBot = await response.json();
      
      // Increment bot usage
      await fetch(`${getApiBase()}/api/user/usage/increment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'bots', amount: 1 }),
      });
      
      setBots((prev) => [...prev, newBot.bot]);
      setActiveBotId(newBot.bot.id);
      return newBot.bot;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateBot = useCallback(async (botId, botData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${getApiBase()}/api/bots/${botId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(botData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update bot' }));
        throw new Error(error.error || 'Failed to update bot');
      }

      const updated = await response.json();
      setBots((prev) =>
        prev.map((bot) => (bot.id === botId ? updated.bot : bot))
      );
      return updated.bot;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteBot = useCallback(async (botId) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${getApiBase()}/api/bots/${botId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete bot' }));
        throw new Error(error.error || 'Failed to delete bot');
      }

      setBots((prev) => prev.filter((bot) => bot.id !== botId));
      if (activeBotId === botId) {
        setActiveBotId(null);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [activeBotId]);

  const selectBot = useCallback((botId) => {
    setActiveBotId(botId);
  }, []);

  const activeBot = bots.find((bot) => bot.id === activeBotId) || null;

  return {
    bots,
    activeBot,
    activeBotId,
    createBot,
    updateBot,
    deleteBot,
    selectBot,
    isLoading,
    error,
    refreshBots: loadBots,
  };
};

export default useBots;

