/**
 * Tests for UsageSection component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import UsageSection from '../../../features/settings/components/UsageSection';

describe('UsageSection', () => {
  const mockUsage = {
    bots: { current: 2, limit: 10 },
    chats: { today: 5, limit: 100 },
    codeToDoc: { used: 3, limit: 50 },
    tokens: { used: 1500, limit: 5000 },
  };

  test('renders usage statistics', () => {
    render(<UsageSection usage={mockUsage} plan="pro" />);
    
    expect(screen.getByText(/usage statistics/i)).toBeInTheDocument();
    expect(screen.getByText(/bots created/i)).toBeInTheDocument();
    expect(screen.getByText(/chats today/i)).toBeInTheDocument();
    expect(screen.getByText(/code to doc uses/i)).toBeInTheDocument();
    expect(screen.getByText(/tokens used/i)).toBeInTheDocument();
  });

  test('displays usage counts correctly', () => {
    render(<UsageSection usage={mockUsage} plan="pro" />);
    
    expect(screen.getByText(/2 \/ 10/i)).toBeInTheDocument();
    expect(screen.getByText(/5 \/ 100/i)).toBeInTheDocument();
    expect(screen.getByText(/3 \/ 50/i)).toBeInTheDocument();
  });

  test('calculates percentages correctly', () => {
    render(<UsageSection usage={mockUsage} plan="pro" />);
    
    // 2/10 = 20%
    expect(screen.getByText(/20% used/i)).toBeInTheDocument();
  });

  test('handles unlimited limits', () => {
    const unlimitedUsage = {
      ...mockUsage,
      bots: { current: 100, limit: -1 }, // -1 means unlimited
    };
    
    render(<UsageSection usage={unlimitedUsage} plan="enterprise" />);
    
    // Check for unlimited text in the usage card (more specific)
    const unlimitedElements = screen.getAllByText(/unlimited/i);
    expect(unlimitedElements.length).toBeGreaterThan(0);
    // Verify it's in the bots card specifically
    expect(screen.getByText(/100 \/ Unlimited/i)).toBeInTheDocument();
  });
});

