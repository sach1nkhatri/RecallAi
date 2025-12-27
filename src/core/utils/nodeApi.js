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
 */
const getAuthToken = () => {
  try {
    const auth = localStorage.getItem('auth');
    if (auth) {
      const authData = JSON.parse(auth);
      return authData.token || null;
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
    const errorData = await response.json().catch(() => ({
      error: `HTTP ${response.status}`,
    }));
    throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`);
  }

  return response.json();
};

export { getNodeApiBase, getAuthToken, nodeApiRequest };

