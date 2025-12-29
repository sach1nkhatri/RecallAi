import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './core/context/AuthContext';

// Mock the App component properly
const renderApp = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  );
};

test('renders app without crashing', () => {
  renderApp();
  // App should render without errors
  expect(document.body).toBeInTheDocument();
});
