import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../core/context/AuthContext';
import { BotProvider } from '../core/context/BotContext';
import AppRoutes from './routes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BotProvider>
          <div className="App">
            <AppRoutes />
          </div>
        </BotProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
