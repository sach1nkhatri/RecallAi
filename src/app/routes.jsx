import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../core/context/AuthContext';

// Layouts
import MainLayout from '../core/layout/MainLayout';
import DashboardLayout from '../core/layout/DashboardLayout';

// Pages
import LandingPage from '../features/landing/pages/LandingPage';
import LoginPage from '../features/auth/pages/LoginPage';
import SignupPage from '../features/auth/pages/SignupPage';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage';
import BotDashboard from '../features/bot/pages/BotDashboard';
import BotSetup from '../features/bot/pages/BotSetup';
import Analytics from '../features/bot/pages/Analytics';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirect to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/"
        element={
          <PublicRoute>
            <MainLayout user={user} onLogout={logout}>
              <LandingPage />
            </MainLayout>
          </PublicRoute>
        }
      />
      
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <SignupPage />
          </PublicRoute>
        }
      />
      
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        }
      />
      
      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout user={user} onLogout={logout}>
              <BotDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/dashboard/bots"
        element={
          <ProtectedRoute>
            <DashboardLayout user={user} onLogout={logout}>
              <BotSetup />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/dashboard/analytics"
        element={
          <ProtectedRoute>
            <DashboardLayout user={user} onLogout={logout}>
              <Analytics />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Catch all route */}
      <Route
        path="*"
        element={
          <Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />
        }
      />
    </Routes>
  );
};

export default AppRoutes;
