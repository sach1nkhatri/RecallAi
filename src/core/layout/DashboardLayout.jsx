import React, { useState, useMemo, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import ReportModal from '../components/ReportModal';
import useGenerationStatus from '../../features/code_to_doc/hooks/useGenerationStatus';
import GenerationProgress from '../../features/code_to_doc/components/GenerationProgress';
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
  
  // Global generation status tracking - shows progress on all pages
  const { status: generationStatus, cancelGeneration } = useGenerationStatus();

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
        {/* Global Generation Progress - Shows on all pages when generation is active */}
        {generationStatus && (
          <div style={{ position: 'sticky', top: 0, zIndex: 1000, marginBottom: '20px' }}>
            <GenerationProgress
              status={generationStatus}
              onCancel={generationStatus.status !== 'completed' && generationStatus.status !== 'failed' ? cancelGeneration : undefined}
            />
          </div>
        )}
        <main className="dashboard-shell-main">
          {children}
        </main>
      </div>
      <ReportModal isOpen={isReportModalOpen} onClose={handleCloseReportModal} />
    </div>
  );
};

export default DashboardLayout;
