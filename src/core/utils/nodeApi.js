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
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @param {number} options.timeout - Request timeout in milliseconds (default: 30000)
 */
const nodeApiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const apiBase = getNodeApiBase();
  const timeout = options.timeout || 30000; // Default 30 seconds

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Create AbortController for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${apiBase}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

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
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle timeout/abort errors
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms. Please try again.`);
    }
    
    // Re-throw other errors
    throw error;
  }
};

export { getNodeApiBase, getAuthToken, nodeApiRequest };

