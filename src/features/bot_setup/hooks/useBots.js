import { useState, useEffect, useCallback } from 'react';
import { getNodeApiBase, getAuthToken, nodeApiRequest } from '../../../core/utils/nodeApi';

const getApiBase = getNodeApiBase;

const useBots = () => {
  const [bots, setBots] = useState([]);
  const [activeBotId, setActiveBotId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadBots = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await nodeApiRequest('/api/bots');
      setBots(data.bots || []);
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
      const usage = await nodeApiRequest('/api/users/usage');
      if (usage.success && usage.usage) {
        if (usage.usage.bots.current >= usage.usage.bots.limit) {
          throw new Error(`Bot limit reached. Free plan allows ${usage.usage.bots.limit} bot(s). Upgrade to create more.`);
        }
      }

      const newBot = await nodeApiRequest('/api/bots', {
        method: 'POST',
        body: JSON.stringify(botData),
      });
      
      // Increment bot usage
      try {
        await nodeApiRequest('/api/users/usage/increment', {
          method: 'POST',
          body: JSON.stringify({ type: 'bots', amount: 1 }),
        });
      } catch (err) {
        console.error('Failed to increment usage:', err);
      }
      
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
      const updated = await nodeApiRequest(`/api/bots/${botId}`, {
        method: 'PUT',
        body: JSON.stringify(botData),
      });
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
      await nodeApiRequest(`/api/bots/${botId}`, {
        method: 'DELETE',
      });
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

