/**
 * Node.js Backend API Utility
 * Handles authentication and API calls to Node backend (port 5002)
 */

const getNodeApiBase = () => {
  if (typeof window === 'undefined') return 'http://localhost:5002';
  const envApi = process.env.REACT_APP_NODE_API_BASE_URL;
  if (envApi) return envApi;
  // Default to port 5002 for Node backend
  return 'http://localhost:5002';
};

/**
 * Get auth token from localStorage
 * Checks both 'token' key and 'auth' object
 */
const getAuthToken = () => {
  try {
    // First, check direct token storage (primary)
    const directToken = localStorage.getItem('token');
    if (directToken) {
      return directToken;
    }

    // Fallback: check auth object
    const auth = localStorage.getItem('auth');
    if (auth) {
      const authData = JSON.parse(auth);
      if (authData.token) {
        // Also store it directly for faster access
        localStorage.setItem('token', authData.token);
        return authData.token;
      }
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
  }
  return null;
};

/**
 * Make authenticated API request to Node backend
 */
const nodeApiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const apiBase = getNodeApiBase();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${apiBase}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Handle 401 Unauthorized - token might be invalid
    if (response.status === 401) {
      // Clear invalid token
      localStorage.removeItem('token');
      const auth = localStorage.getItem('auth');
      if (auth) {
        try {
          const authData = JSON.parse(auth);
          if (authData.token) {
            delete authData.token;
            localStorage.setItem('auth', JSON.stringify(authData));
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    
    const errorData = await response.json().catch(() => ({
      error: `HTTP ${response.status}`,
    }));
    throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`);
  }

  return response.json();
};

export { getNodeApiBase, getAuthToken, nodeApiRequest };

