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
import Checkout from '../features/payment_gateway/component/CheckoutPage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route Component
const PublicRoute = ({ children }) => {
    return children;
};

// Public Route that doesn't redirect even if authenticated
const OpenRoute = ({ children }) => {
    return children;
};

const DashboardHome = () => null;

const AppRoutes = () => {
    const { user, logout } = useAuth();

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

            {/* Open Routes - Accessible by anyone */}
            <Route
                path="/checkout"
                element={
                    <OpenRoute>
                        <Checkout />
                    </OpenRoute>
                }
            />

            {/* Protected Routes */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <DashboardLayout>
                            <DashboardHome />
                        </DashboardLayout>
                    </ProtectedRoute>
                }
            />

            {/* Catch all route */}
            <Route
                path="*"
                element={<Navigate to="/" replace />}
            />
        </Routes>
    );
};

export default AppRoutes;
