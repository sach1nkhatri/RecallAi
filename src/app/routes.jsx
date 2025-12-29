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
import PricingPage from '../features/pricing/pages/PricingPage';
import CodeToDocPage from '../features/code_to_doc/page/codetodoc';
import DashboardHome from '../features/dashboard/pages/DashboardHome';
import BotSetupPage from '../features/bot_setup/page/BotSetupPage';
import HelpAndFAQPage from '../features/help/pages/HelpAndFAQPage';
import SettingsPage from '../features/settings/page/SettingsPage';
import AdminLoginPage from '../features/admin_dashboard/pages/AdminLoginPage';
import AdminDashboard from '../features/admin_dashboard/pages/AdminDashboard';
import AdminProtectedRoute from '../core/middleware/AdminProtectedRoute';

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

            {/* Pricing Page - Public */}
            <Route
                path="/pricing"
                element={
                    <PublicRoute>
                        <MainLayout user={user} onLogout={logout}>
                            <PricingPage />
                        </MainLayout>
                    </PublicRoute>
                }
            />

            {/* Checkout Route - Requires authentication */}
            <Route
                path="/checkout"
                element={
                    <ProtectedRoute>
                        <Checkout />
                    </ProtectedRoute>
                }
            />

            {/* Protected Dashboard Routes */}
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
            <Route
                path="/dashboard/code-to-doc"
                element={
                    <ProtectedRoute>
                        <DashboardLayout>
                            <CodeToDocPage />
                        </DashboardLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/dashboard/bot-setup"
                element={
                    <ProtectedRoute>
                        <DashboardLayout>
                            <BotSetupPage />
                        </DashboardLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/dashboard/faq"
                element={
                    <ProtectedRoute>
                        <DashboardLayout>
                            <HelpAndFAQPage />
                        </DashboardLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/dashboard/settings"
                element={
                    <ProtectedRoute>
                        <DashboardLayout>
                            <SettingsPage />
                        </DashboardLayout>
                    </ProtectedRoute>
                }
            />

            {/* Admin Routes */}
            <Route
                path="/admin"
                element={<AdminLoginPage />}
            />
            <Route
                path="/admin/dashboard"
                element={
                    <AdminProtectedRoute>
                        <AdminDashboard />
                    </AdminProtectedRoute>
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
