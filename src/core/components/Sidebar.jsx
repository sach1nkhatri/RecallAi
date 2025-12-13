import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import dashboardIcon from '../../assets/sidebar_icons/dashboard_icon.png';
import botIcon from '../../assets/sidebar_icons/bot_logo.png';
import docIcon from '../../assets/sidebar_icons/doc_analysis_logo.png';
import reportIcon from '../../assets/sidebar_icons/report_icon.png';
import faqIcon from '../../assets/sidebar_icons/faq_logo.png';
import settingsIcon from '../../assets/sidebar_icons/settings_icon.png';
import '../css/Sidebar.css';

const Sidebar = ({ onSectionChange, onReportClick }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);

  const menuItems = useMemo(
    () => [
      { label: 'Dashboard', icon: dashboardIcon },
      { label: 'Bot Setup', icon: botIcon },
      { label: 'Doc_analysis', icon: docIcon },
      { divider: true },
      { label: 'Report', icon: reportIcon, onClick: onReportClick },
      { label: 'Help and Faq', icon: faqIcon },
      { label: 'Settings', icon: settingsIcon }
    ],
    [onReportClick]
  );

  const toggleCollapse = () => setCollapsed(!collapsed);
  const toggleUserInfo = () => setShowUserInfo(!showUserInfo);

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
            <hr key={idx} className="menu-divider" />
          ) : (
            <div
              key={item.label}
              className="menu-item"
              onClick={() => {
                if (item.onClick) {
                  item.onClick();
                  return;
                }
                onSectionChange?.(item.label);
              }}
            >
              <img src={item.icon} alt={item.label} className="menu-icon" />
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
              {showUserInfo ? '▲' : '▼'}
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
          {collapsed ? '→' : '←'}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
