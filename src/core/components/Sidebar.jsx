import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSidebarMenuItems, isRouteActive } from '../config/dashboardRoutes';
import '../css/Sidebar.css';

const Sidebar = ({ onSectionChange, onReportClick, collapsed: collapsedProp, onToggleCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const collapsed = collapsedProp ?? internalCollapsed;
  const toggleCollapse = onToggleCollapse ?? (() => setInternalCollapsed((prev) => !prev));

  // Get menu items from centralized config
  const menuItems = useMemo(() => {
    const items = getSidebarMenuItems();
    // Replace onClick handlers for items that need them
    return items.map((item) => {
      if (item.label === 'Report' && onReportClick) {
        return { ...item, onClick: onReportClick };
      }
      return item;
    });
  }, [onReportClick]);

  // Optimized active check using centralized function
  const isActive = useCallback(
    (item) => {
      if (!item.to) return false;
      return isRouteActive(item, location.pathname);
    },
    [location.pathname]
  );

  // Optimized navigation handler
  const handleNavigation = useCallback(
    (item) => {
      if (item.onClick) {
        item.onClick();
        return;
      }
      if (item.to) {
        navigate(item.to);
        return;
      }
      onSectionChange?.(item.label);
    },
    [navigate, onSectionChange]
  );

  const toggleUserInfo = () => setShowUserInfo((prev) => !prev);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div
          className="logo-icon"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ' ? navigate('/') : null)}
        >
          R
        </div>
        {!collapsed && (
          <button
            type="button"
            className="logo-text"
            onClick={() => navigate('/')}
          >
            Recall AI
          </button>
        )}
      </div>

      <div className="sidebar-menu">
        {menuItems.map((item, idx) =>
          item.divider ? (
            <hr key={`divider-${idx}`} className="menu-divider" />
          ) : (
            <div
              key={item.label}
              className={`menu-item ${isActive(item) ? 'active' : ''}`}
              onClick={() => handleNavigation(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleNavigation(item);
                }
              }}
              aria-label={item.label}
            >
              <img src={item.icon} alt={item.label} className="menu-icon" loading="lazy" />
              {!collapsed && <span>{item.label}</span>}
            </div>
          )
        )}
      </div>

      <div className="sidebar-footer">
        <div className="user-toggle" onClick={toggleUserInfo}>
          <div className="user-icon">{(user?.name || 'U').charAt(0)}</div>
          {!collapsed && <span className="username">{user?.name || 'User'}</span>}
          {!collapsed && (
            <span className={`arrow-toggle ${showUserInfo ? 'open' : ''}`} aria-hidden="true">
              {showUserInfo ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              )}
            </span>
          )}
        </div>

        {!collapsed && showUserInfo && (
          <div className="user-details">
            <p><strong>Email:</strong> {user?.email || 'Not available'}</p>
            <button className="logout-btn" type="button" onClick={handleLogoutClick}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Logout
            </button>
          </div>
        )}

        {collapsed && (
          <button 
            className="logout-btn-collapsed" 
            type="button" 
            onClick={handleLogoutClick}
            aria-label="Logout"
            title="Logout"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        )}

        {/* Logout Confirmation Modal */}
        {showLogoutConfirm && (
          <div className="logout-confirm-overlay" onClick={handleLogoutCancel}>
            <div className="logout-confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="logout-confirm-header">
                <div className="logout-confirm-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                </div>
                <h3>Confirm Logout</h3>
              </div>
              <div className="logout-confirm-content">
                <p>Are you sure you want to logout?</p>
                <p className="logout-confirm-subtext">You will need to login again to access your account.</p>
              </div>
              <div className="logout-confirm-actions">
                <button 
                  className="logout-confirm-cancel" 
                  type="button"
                  onClick={handleLogoutCancel}
                >
                  Cancel
                </button>
                <button 
                  className="logout-confirm-logout" 
                  type="button"
                  onClick={handleLogoutConfirm}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}

        <button className="collapse-btn" onClick={toggleCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
