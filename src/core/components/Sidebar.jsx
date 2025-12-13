import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../css/Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);

  const menuItems = useMemo(
    () => [
      { label: 'Dashboard', icon: getIcon('grid') },
      { divider: true },
      { label: 'Bot Setup', icon: getIcon('bot') },
      { label: 'Performance', icon: getIcon('performance') },
      { divider: true },
      { label: 'Help & FAQ', icon: getIcon('help') },
      { label: 'Report', icon: getIcon('alert') }
    ],
    []
  );

  const toggleCollapse = () => setCollapsed((prev) => !prev);
  const toggleUserInfo = () => setShowUserInfo((prev) => !prev);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button
          type="button"
          className="logo-icon"
          onClick={() => navigate('/')}
          aria-label="Go to home"
        >
          R
        </button>
        {!collapsed && (
          <button
            type="button"
            className="logo-text"
            onClick={() => navigate('/')}
            aria-label="Go to home"
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
            <div key={item.label} className="menu-item" role="presentation">
              <span className="menu-icon">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </div>
          )
        )}
      </div>

      <div className="sidebar-footer">
        <div className="user-toggle" onClick={toggleUserInfo} role="button" tabIndex={0}>
          <div className="user-icon">{(user?.name || 'U').charAt(0)}</div>
          {!collapsed && <span className="username">{user?.name || 'User'}</span>}
          {!collapsed && (
            <span className="arrow-toggle" aria-hidden="true">
              {showUserInfo ? '▲' : '▼'}
            </span>
          )}
        </div>

        {!collapsed && showUserInfo && (
          <div className="user-details">
            <p>
              <strong>Email:</strong> {user?.email || 'Not available'}
            </p>
            <button className="logout-btn" type="button" onClick={logout}>
              Logout
            </button>
          </div>
        )}

        <button type="button" className="collapse-btn" onClick={toggleCollapse}>
          {collapsed ? '→ Expand' : '← Collapse'}
        </button>
      </div>
    </aside>
  );
};

const getIcon = (iconName) => {
  const icons = {
    grid: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" fill="currentColor" />
      </svg>
    ),
    bot: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 2a2 2 0 104 0h2a1 1 0 110 2h-1v2h1a3 3 0 013 3v5a3 3 0 01-3 3h-1v2h1a1 1 0 110 2H7a1 1 0 110-2h1v-2H7a3 3 0 01-3-3V9a3 3 0 013-3h1V4H7a1 1 0 110-2h3zm3 18v-2h-2v2h2zm3-6a1 1 0 100-2 1 1 0 000 2zM8 15a1 1 0 100-2 1 1 0 000 2zm8-6H8a1 1 0 00-1 1v5a1 1 0 001 1h8a1 1 0 001-1v-5a1 1 0 00-1-1z" fill="currentColor" />
      </svg>
    ),
    performance: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 13h3v7H4zm6-4h3v11h-3zm6-5h3v16h-3z" fill="currentColor" />
      </svg>
    ),
    settings: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19.14 12.936a7.957 7.957 0 000-1.872l2.037-1.58a.5.5 0 00.12-.638l-1.928-3.338a.5.5 0 00-.607-.22l-2.397.96a7.992 7.992 0 00-1.62-.936l-.363-2.54A.5.5 0 0014.9 2h-3.8a.5.5 0 00-.495.42l-.363 2.54a7.992 7.992 0 00-1.62.936l-2.397-.96a.5.5 0 00-.607.22L2.69 8.846a.5.5 0 00.12.638l2.037 1.58a7.957 7.957 0 000 1.872l-2.037 1.58a.5.5 0 00-.12.638l1.928 3.338a.5.5 0 00.607.22l2.397-.96c.5.39 1.043.72 1.62.936l.363 2.54a.5.5 0 00.495.42h3.8a.5.5 0 00.495-.42l.363-2.54a7.992 7.992 0 001.62-.936l2.397.96a.5.5 0 00.607-.22l1.928-3.338a.5.5 0 00-.12-.638l-2.037-1.58zM12 15a3 3 0 110-6 3 3 0 010 6z" fill="currentColor" />
      </svg>
    ),
    alert: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a1 1 0 00.86 1.5h18.64a1 1 0 00.86-1.5L13.71 3.86a1 1 0 00-1.72 0zM13 17h-2v-2h2v2zm0-4h-2V9h2v4z" fill="currentColor" />
      </svg>
    ),
    help: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 15a1.25 1.25 0 110-2.5A1.25 1.25 0 0112 17zm1.64-6.36c-.31.35-.58.64-.74.93-.13.23-.17.38-.17.68v.25h-2v-.34c0-.46.1-.83.28-1.15.25-.46.63-.85 1.08-1.31.41-.4.71-.73.86-1.05.14-.3.2-.55.2-.86 0-.5-.2-.95-.55-1.24-.36-.3-.83-.45-1.4-.45-.64 0-1.16.18-1.52.54-.35.34-.53.82-.53 1.42H7.7c0-1.04.35-1.9 1.03-2.55.69-.66 1.63-1 2.79-1 1.08 0 1.96.27 2.6.8.67.55 1.02 1.34 1.02 2.33 0 .63-.12 1.18-.37 1.65-.25.47-.61.9-1.13 1.44z" fill="currentColor" />
      </svg>
    )
  };

  return icons[iconName] || null;
};

export default Sidebar;
