import React from 'react';
import Sidebar from '../components/Sidebar';

const DashboardLayout = ({ children }) => {
  return (
    <div className="dashboard-shell">
      <Sidebar />
      <div className="dashboard-shell-content">
        <main className="dashboard-shell-main">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
