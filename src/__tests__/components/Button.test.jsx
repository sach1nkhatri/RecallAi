/**
 * Tests for Button component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../../../core/components/Button';

describe('Button Component', () => {
  test('renders button with text', () => {
    render(<Button>Click Me</Button>);
    const button = screen.getByText('Click Me');
    expect(button).toBeInTheDocument();
  });

  test('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    
    fireEvent.click(screen.getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('shows loading state', () => {
    render(<Button loading>Submit</Button>);
    const button = screen.getByText('Submit');
    expect(button).toBeDisabled();
  });

  test('applies variant classes', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    let button = screen.getByText('Primary');
    expect(button).toHaveClass('btn-primary');

    rerender(<Button variant="danger">Danger</Button>);
    button = screen.getByText('Danger');
    expect(button).toHaveClass('btn-danger');
  });

  test('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByText('Disabled');
    expect(button).toBeDisabled();
  });
});

