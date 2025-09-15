export const APP_NAME = 'Recall AI';
export const APP_DESCRIPTION = 'Intelligent RAG-powered knowledge management';

export const API_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  SIGNUP: '/api/auth/signup',
  LOGOUT: '/api/auth/logout',
  BOTS: '/api/bots',
  UPLOAD: '/api/upload'
};

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  DASHBOARD: '/dashboard',
  BOTS: '/dashboard/bots',
  ANALYTICS: '/dashboard/analytics',
  SETTINGS: '/dashboard/settings',
  PROFILE: '/profile'
};

export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  BOT_NAME_MAX_LENGTH: 50,
  DESCRIPTION_MAX_LENGTH: 500
};

export const FILE_TYPES = {
  ALLOWED_EXTENSIONS: ['.pdf', '.doc', '.docx', '.txt', '.md'],
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES: 10
};

export const THEME = {
  COLORS: {
    PRIMARY: '#3b82f6',
    SECONDARY: '#a855f7',
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    GRAY: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827'
    }
  },
  SPACING: {
    XS: '0.25rem',
    SM: '0.5rem',
    MD: '1rem',
    LG: '1.5rem',
    XL: '2rem',
    '2XL': '3rem'
  },
  BORDER_RADIUS: {
    SM: '0.375rem',
    MD: '0.5rem',
    LG: '0.75rem',
    XL: '1rem'
  }
};

export const MOCK_DATA = {
  USER: {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    avatar: null,
    createdAt: new Date().toISOString()
  },
  BOTS: [
    {
      id: 1,
      name: 'Customer Support Bot',
      description: 'AI assistant for handling customer inquiries and support tickets',
      status: 'active',
      createdAt: new Date().toISOString(),
      documents: 15,
      queries: 234
    },
    {
      id: 2,
      name: 'Product Knowledge Bot',
      description: 'Knowledge base for product information and specifications',
      status: 'training',
      createdAt: new Date().toISOString(),
      documents: 8,
      queries: 89
    }
  ]
};
