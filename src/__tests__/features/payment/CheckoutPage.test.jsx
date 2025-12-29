/**
 * Tests for CheckoutPage component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CheckoutPage from '../../../features/payment_gateway/component/CheckoutPage';
import { AuthProvider } from '../../../core/context/AuthContext';

const renderWithProviders = (ui, initialState = null) => {
  const state = initialState || {
    planName: 'Professional Plan',
    planType: 'pro',
    planPrice: 'NPR.700/month',
    planDuration: 'Monthly',
  };

  return render(
    <MemoryRouter 
      initialEntries={[{ pathname: '/checkout', state }]}
    >
      <AuthProvider>
        {ui}
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('CheckoutPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    localStorage.setItem('token', 'test-token');
    
    // Mock successful payment status check
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        payments: [],
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('renders checkout page with plan details', () => {
    renderWithProviders(<CheckoutPage />);

    expect(screen.getByText(/professional plan/i)).toBeInTheDocument();
    expect(screen.getByText(/confirm your payment/i)).toBeInTheDocument();
  });

  test('allows selecting payment method', () => {
    renderWithProviders(<CheckoutPage />);

    const khaltiButton = screen.getByText(/khalti/i);
    fireEvent.click(khaltiButton);
    expect(khaltiButton.closest('.method-tile')).toHaveClass('active');
  });

  test('handles screenshot upload', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        payment: {
          _id: 'payment-id',
          status: 'pending',
        },
      }),
    });

    const { container } = renderWithProviders(<CheckoutPage />);

    const file = new File(['test'], 'screenshot.png', { type: 'image/png' });
    // Find file input by type since label doesn't have 'for' attribute
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();

    fireEvent.change(fileInput, { target: { files: [file] } });

    const submitButton = screen.getByText(/i've paid/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});

