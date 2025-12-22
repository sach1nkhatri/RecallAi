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
              {showUserInfo ? '^' : 'v'}
            </span>
          )}
        </div>

        {!collapsed && showUserInfo && (
          <div className="user-details">
            <p><strong>Email:</strong> {user?.email || 'Not available'}</p>
            <button className="logout-btn" type="button" onClick={logout}>
              Logout
            </button>
          </div>
        )}

        <button className="collapse-btn" onClick={toggleCollapse}>
          {collapsed ? '>' : '<'}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
