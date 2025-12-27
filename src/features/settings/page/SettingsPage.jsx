import React, { useState } from 'react';
import useUserSettings from '../hooks/useUserSettings';
import { useAuth } from '../../../core/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ProfileSection from '../components/ProfileSection';
import PlanSection from '../components/PlanSection';
import UsageSection from '../components/UsageSection';
import DangerSection from '../components/DangerSection';
import Toast from '../../code_to_doc/components/Toast';
import '../css/SettingsPage.css';

const SettingsPage = () => {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const {
    user,
    usage,
    plan,
    isLoading,
    error,
    updateUser,
    deleteAllBots,
    deleteAllCodeToDocHistory,
    deleteAccount,
  } = useUserSettings();

  const [toast, setToast] = useState({ message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'info' }), 3000);
  };

  const handleUpdateProfile = async (userData) => {
    try {
      await updateUser(userData);
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    }
  };

  const handleDeleteAllBots = async () => {
    try {
      await deleteAllBots();
      showToast('All bots deleted successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to delete bots', 'error');
    }
  };

  const handleDeleteCodeToDocHistory = async () => {
    try {
      await deleteAllCodeToDocHistory();
      showToast('Code to Doc history deleted successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to delete history', 'error');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      showToast('Account deleted successfully', 'success');
      logout();
      navigate('/');
    } catch (err) {
      showToast(err.message || 'Failed to delete account', 'error');
    }
  };

  return (
    <div className="settings-page">
      <Toast message={toast.message} type={toast.type} />
      
      <header className="settings-header">
        <div className="settings-header-content">
          <div className="settings-header-left">
            <p className="settings-step-label">Dashboard / Settings</p>
            <h1>Settings</h1>
            <p className="settings-tagline">
              Manage your account, subscription, and preferences
            </p>
          </div>
        </div>
      </header>

      <div className="settings-container">
        <div className="settings-content">
          <ProfileSection
            user={user || authUser}
            onUpdate={handleUpdateProfile}
            isLoading={isLoading}
          />

          <PlanSection
            currentPlan={plan}
            onUpgrade={() => navigate('/checkout')}
          />

          <UsageSection
            usage={usage}
            plan={plan}
          />

          <DangerSection
            onDeleteAllBots={handleDeleteAllBots}
            onDeleteCodeToDocHistory={handleDeleteCodeToDocHistory}
            onDeleteAccount={handleDeleteAccount}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

