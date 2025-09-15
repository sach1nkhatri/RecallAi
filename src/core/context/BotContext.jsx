import React, { createContext, useContext, useReducer, useEffect, useMemo, useCallback } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { MOCK_DATA } from '../utils/constants';

const BotContext = createContext();

const botReducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_BOTS_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_BOTS_SUCCESS':
      return { 
        ...state, 
        loading: false, 
        bots: action.payload,
        error: null 
      };
    case 'FETCH_BOTS_FAILURE':
      return { 
        ...state, 
        loading: false, 
        error: action.payload 
      };
    case 'CREATE_BOT_START':
      return { ...state, creating: true, error: null };
    case 'CREATE_BOT_SUCCESS':
      return { 
        ...state, 
        creating: false, 
        bots: [...state.bots, action.payload],
        error: null 
      };
    case 'CREATE_BOT_FAILURE':
      return { 
        ...state, 
        creating: false, 
        error: action.payload 
      };
    case 'UPDATE_BOT_SUCCESS':
      return {
        ...state,
        bots: state.bots.map(bot => 
          bot.id === action.payload.id ? action.payload : bot
        )
      };
    case 'DELETE_BOT_SUCCESS':
      return {
        ...state,
        bots: state.bots.filter(bot => bot.id !== action.payload)
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

const initialState = {
  bots: [],
  loading: false,
  creating: false,
  error: null
};

export const BotProvider = ({ children }) => {
  const [storedBots, setStoredBots] = useLocalStorage('bots', MOCK_DATA.BOTS);
  const [state, dispatch] = useReducer(botReducer, { ...initialState, bots: storedBots });

  // Update localStorage when bots change
  useEffect(() => {
    setStoredBots(state.bots);
  }, [state.bots, setStoredBots]);

  const fetchBots = useCallback(async () => {
    // Don't show loading if we already have data
    if (state.bots.length === 0) {
      dispatch({ type: 'FETCH_BOTS_START' });
    }
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      dispatch({ type: 'FETCH_BOTS_SUCCESS', payload: storedBots });
    } catch (error) {
      dispatch({ type: 'FETCH_BOTS_FAILURE', payload: error.message });
    }
  }, [storedBots, state.bots.length]);

  const createBot = useCallback(async (botData) => {
    dispatch({ type: 'CREATE_BOT_START' });
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newBot = {
        id: Date.now(),
        name: botData.name,
        description: botData.description,
        status: 'training',
        createdAt: new Date().toISOString(),
        documents: 0,
        queries: 0,
        ...botData
      };
      
      dispatch({ type: 'CREATE_BOT_SUCCESS', payload: newBot });
      return { success: true, bot: newBot };
    } catch (error) {
      dispatch({ type: 'CREATE_BOT_FAILURE', payload: error.message });
      return { success: false, error: error.message };
    }
  }, []);

  const updateBot = useCallback(async (id, updates) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedBot = {
        ...state.bots.find(bot => bot.id === id),
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      dispatch({ type: 'UPDATE_BOT_SUCCESS', payload: updatedBot });
      return { success: true, bot: updatedBot };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [state.bots]);

  const deleteBot = useCallback(async (id) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      dispatch({ type: 'DELETE_BOT_SUCCESS', payload: id });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value = useMemo(() => ({
    ...state,
    fetchBots,
    createBot,
    updateBot,
    deleteBot,
    clearError
  }), [state, fetchBots, createBot, updateBot, deleteBot, clearError]);

  return (
    <BotContext.Provider value={value}>
      {children}
    </BotContext.Provider>
  );
};

export const useBot = () => {
  const context = useContext(BotContext);
  if (!context) {
    throw new Error('useBot must be used within a BotProvider');
  }
  return context;
};
