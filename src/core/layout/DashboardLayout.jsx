import React, { useState, useMemo, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
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

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const newState = !prev;
      localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
      return newState;
    });
  }, []);

  // Memoize layout classes
  const layoutClasses = useMemo(
    () => `dashboard-shell ${collapsed ? 'collapsed' : 'expanded'}`,
    [collapsed]
  );

  return (
    <div className={layoutClasses}>
      <Sidebar collapsed={collapsed} onToggleCollapse={handleToggleCollapse} />
      <div className="dashboard-shell-content">
        <main className="dashboard-shell-main">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
