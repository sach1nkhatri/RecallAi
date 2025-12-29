import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserManagement from '../components/UserManagement';
import PaymentManagement from '../components/PaymentManagement';
import ReportManagement from '../components/ReportManagement';
import HelpFAQManagement from '../components/HelpFAQManagement';
import DashboardOverview from '../components/DashboardOverview';
import '../css/AdminDashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    navigate('/admin');
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'payments', label: 'Payments', icon: '💳' },
    { id: 'reports', label: 'Reports', icon: '📋' },
    { id: 'faq', label: 'Help & FAQ', icon: '❓' },
  ];

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header-content">
          <h1>Admin Dashboard</h1>
          <button onClick={handleLogout} className="admin-logout-btn">
            Logout
          </button>
        </div>
      </header>

      <div className="admin-container">
        <aside className="admin-sidebar">
          <nav className="admin-nav">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`admin-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="nav-icon">{tab.icon}</span>
                <span className="nav-label">{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="admin-main">
          {activeTab === 'overview' && <DashboardOverview />}
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'payments' && <PaymentManagement />}
          {activeTab === 'reports' && <ReportManagement />}
          {activeTab === 'faq' && <HelpFAQManagement />}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;

