import React, { createContext, useContext, useReducer, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { MOCK_DATA } from '../utils/constants';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return { 
        ...state, 
        loading: false, 
        isAuthenticated: true, 
        user: action.payload,
        error: null 
      };
    case 'LOGIN_FAILURE':
      return { 
        ...state, 
        loading: false, 
        isAuthenticated: false, 
        user: null,
        error: action.payload 
      };
    case 'LOGOUT':
      return { 
        ...state, 
        isAuthenticated: false, 
        user: null, 
        error: null 
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

const initialState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null
};

export const AuthProvider = ({ children }) => {
  const [storedAuth, setStoredAuth] = useLocalStorage('auth', initialState);
  const [state, dispatch] = useReducer(authReducer, storedAuth);

  // Update localStorage when state changes
  useEffect(() => {
    setStoredAuth(state);
  }, [state, setStoredAuth]);

  const login = async (email, password) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock validation
      if (email === 'demo@example.com' && password === 'password') {
        const user = { ...MOCK_DATA.USER, email };
        dispatch({ type: 'LOGIN_SUCCESS', payload: user });
        return { success: true };
      } else {
        throw new Error('Invalid email or password');
      }
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE', payload: error.message });
      return { success: false, error: error.message };
    }
  };

  const signup = async (name, email, password) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock validation
      if (email && password && name) {
        const user = { 
          id: Date.now(),
          name, 
          email, 
          avatar: null,
          createdAt: new Date().toISOString()
        };
        dispatch({ type: 'LOGIN_SUCCESS', payload: user });
        return { success: true };
      } else {
        throw new Error('Please fill in all fields');
      }
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE', payload: error.message });
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    ...state,
    login,
    signup,
    logout,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
