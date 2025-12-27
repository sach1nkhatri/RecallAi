import React, { useState, useMemo, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import ReportModal from '../components/ReportModal';
import '../css/DashboardLayout.css';

/**
 * Optimized Dashboard Layout Component
 * Manages sidebar state and provides consistent layout for all dashboard pages
 */
const DashboardLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(() => {
    // Persist sidebar state in localStorage
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const newState = !prev;
      localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
      return newState;
    });
  }, []);

  const handleReportClick = useCallback(() => {
    setIsReportModalOpen(true);
  }, []);

  const handleCloseReportModal = useCallback(() => {
    setIsReportModalOpen(false);
  }, []);

  // Memoize layout classes
  const layoutClasses = useMemo(
    () => `dashboard-shell ${collapsed ? 'collapsed' : 'expanded'}`,
    [collapsed]
  );

  return (
    <div className={layoutClasses}>
      <Sidebar 
        collapsed={collapsed} 
        onToggleCollapse={handleToggleCollapse}
        onReportClick={handleReportClick}
      />
      <div className="dashboard-shell-content">
        <main className="dashboard-shell-main">
          {children}
        </main>
      </div>
      <ReportModal isOpen={isReportModalOpen} onClose={handleCloseReportModal} />
    </div>
  );
};

export default DashboardLayout;
