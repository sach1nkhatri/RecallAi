/**
 * Integration tests for Authentication Flow
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../core/context/AuthContext';
import LoginForm from '../../features/auth/components/LoginForm';
import ProtectedRoute from '../../app/routes';

// Mock API
const mockFetch = jest.fn();
global.fetch = mockFetch;

const renderWithRouter = (ui, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('Authentication Flow', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    localStorage.clear();
  });

  test('complete login flow', async () => {
    // Mock successful login
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        token: 'test-token',
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          plan: 'free',
        },
      }),
    });

    renderWithRouter(<LoginForm />);

    // Fill form
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    // Verify token is stored
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('test-token');
    });
  });

  test('redirects to login when not authenticated', () => {
    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    // Should redirect to login (implementation depends on your ProtectedRoute)
    // This is a placeholder - adjust based on your actual implementation
  });
});

