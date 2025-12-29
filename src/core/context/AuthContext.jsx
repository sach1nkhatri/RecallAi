import React, { createContext, useContext, useReducer, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { getNodeApiBase } from '../utils/nodeApi';

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

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Check for token in localStorage (primary source)
      const token = localStorage.getItem('token');
      
      // If no token, check if auth state has token
      if (!token) {
        const authData = localStorage.getItem('auth');
        if (authData) {
          try {
            const parsed = JSON.parse(authData);
            if (parsed.token) {
              // Token exists in auth object, verify it
              await verifyToken(parsed.token);
              return;
            }
          } catch (e) {
            console.error('Error parsing auth data:', e);
          }
        }
        // No token found anywhere, ensure logged out state
        if (storedAuth.isAuthenticated) {
          dispatch({ type: 'LOGOUT' });
        }
        return;
      }

      // Token exists, verify it
      await verifyToken(token);
    };

    const verifyToken = async (tokenToVerify) => {
      try {
        // Verify token is still valid
        const response = await fetch(`${getNodeApiBase()}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${tokenToVerify}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            // Token is valid, restore auth state
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: {
                id: data.user.id || data.user._id,
                name: data.user.name,
                email: data.user.email,
                plan: data.user.plan || 'free',
              },
            });
            // Ensure token is stored in both places
            if (!localStorage.getItem('token')) {
              localStorage.setItem('token', tokenToVerify);
            }
          } else {
            // Invalid response, logout
            clearAuth();
          }
        } else {
          // Token invalid, logout
          clearAuth();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // On error, don't clear auth if we have a valid stored state
        // Only clear if token verification explicitly failed
        if (error.message && error.message.includes('401')) {
          clearAuth();
        }
      }
    };

    const clearAuth = () => {
      dispatch({ type: 'LOGOUT' });
      localStorage.removeItem('auth');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    };

    checkAuth();
  }, []);

  // Update localStorage when state changes
  useEffect(() => {
    setStoredAuth(state);
  }, [state, setStoredAuth]);

  const login = async (email, password) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const response = await fetch(`${getNodeApiBase()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }

      // Store token and user
      const user = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        plan: data.user.plan,
      };

      const authState = {
        isAuthenticated: true,
        user,
        token: data.token,
        loading: false,
        error: null,
      };

      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      localStorage.setItem('auth', JSON.stringify(authState));
      localStorage.setItem('token', data.token);
      
      return { success: true, user, token: data.token };
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE', payload: error.message });
      return { success: false, error: error.message };
    }
  };

  const signup = async (name, email, password) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const response = await fetch(`${getNodeApiBase()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      // Store token and user
      const user = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        plan: data.user.plan,
      };

      const authState = {
        isAuthenticated: true,
        user,
        token: data.token,
        loading: false,
        error: null,
      };

      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      localStorage.setItem('auth', JSON.stringify(authState));
      localStorage.setItem('token', data.token);
      
      return { success: true, user, token: data.token };
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE', payload: error.message });
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT' });
    localStorage.removeItem('auth');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
