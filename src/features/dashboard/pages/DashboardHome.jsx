import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import useBots from '../../bot_setup/hooks/useBots';
import useGenerationHistory from '../hooks/useGenerationHistory';
import '../css/DashboardHome.css';

const DashboardHome = () => {
  const { bots, isLoading: botsLoading } = useBots();
  const { history, isLoading: historyLoading, formatDate, getStatusColor, getStatusLabel } = useGenerationHistory();

  // Calculate stats
  const stats = useMemo(() => {
    const totalBots = bots.length;
    const activeBots = bots.filter(bot => bot.status === 'active').length;
    const totalGenerations = history.length;
    const completedGenerations = history.filter(h => h.status === 'completed').length;
    
    return {
      totalBots,
      activeBots,
      totalGenerations,
      completedGenerations,
    };
  }, [bots, history]);

  return (
    <div className="dashboard-home">
      {/* Hero Section */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-content">
          <h1 className="dashboard-hero-title">
            Welcome back!
          </h1>
          <p className="dashboard-hero-subtitle">
            Transform your workflow with intelligent automation. Create bots, generate docs, and boost productivity.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="dashboard-stats">
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div className="dashboard-stat-content">
            <div className="dashboard-stat-value">{stats.totalBots}</div>
            <div className="dashboard-stat-label">Total Bots</div>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div className="dashboard-stat-content">
            <div className="dashboard-stat-value">{stats.totalGenerations}</div>
            <div className="dashboard-stat-label">Total Generations</div>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div className="dashboard-stat-content">
            <div className="dashboard-stat-value">{stats.completedGenerations}</div>
            <div className="dashboard-stat-label">Completed</div>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div className="dashboard-stat-content">
            <div className="dashboard-stat-value">{stats.activeBots}</div>
            <div className="dashboard-stat-label">Active Bots</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-container">
        {/* Bots Overview Section */}
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">Your Bots</h2>
            <Link to="/dashboard/bot-setup" className="dashboard-section-action">
              <span>Create New Bot</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </Link>
          </div>

          {botsLoading ? (
            <div className="dashboard-loading">Loading bots...</div>
          ) : bots.length === 0 ? (
            <div className="dashboard-empty-state">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="dashboard-empty-icon">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <h3>No bots yet</h3>
              <p>Create your first AI-powered chatbot to get started</p>
              <Link to="/dashboard/bot-setup" className="dashboard-empty-action">
                Create Your First Bot
              </Link>
            </div>
          ) : (
            <div className="dashboard-bots-grid">
              {bots.slice(0, 6).map((bot) => (
                <div key={bot.id} className="dashboard-bot-card">
                  <div className="dashboard-bot-header">
                    <div className="dashboard-bot-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                    <div className="dashboard-bot-status" style={{ 
                      backgroundColor: bot.status === 'active' ? '#10b981' : '#6b7280' 
                    }}>
                      {bot.status || 'inactive'}
                    </div>
                  </div>
                  <div className="dashboard-bot-content">
                    <h3 className="dashboard-bot-name">{bot.name || 'Unnamed Bot'}</h3>
                    <p className="dashboard-bot-description">
                      {bot.description || 'No description provided'}
                    </p>
                    <div className="dashboard-bot-stats">
                      <div className="dashboard-bot-stat">
                        <span className="dashboard-bot-stat-value">{bot.documentCount || 0}</span>
                        <span className="dashboard-bot-stat-label">Documents</span>
                      </div>
                      <div className="dashboard-bot-stat">
                        <span className="dashboard-bot-stat-value">{bot.queryCount || 0}</span>
                        <span className="dashboard-bot-stat-label">Queries</span>
                      </div>
                    </div>
                  </div>
                  <div className="dashboard-bot-footer">
                    <Link to={`/dashboard/bot-setup?botId=${bot.id}`} className="dashboard-bot-link">
                      Manage Bot
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Code to Doc History Section */}
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">Code to Doc History</h2>
            <Link to="/dashboard/code-to-doc" className="dashboard-section-action">
              <span>Generate New</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </Link>
          </div>

          {historyLoading ? (
            <div className="dashboard-loading">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="dashboard-empty-state">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="dashboard-empty-icon">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <h3>No generation history</h3>
              <p>Start generating documentation from your code</p>
              <Link to="/dashboard/code-to-doc" className="dashboard-empty-action">
                Generate Documentation
              </Link>
            </div>
          ) : (
            <div className="dashboard-history-list">
              {history.map((item) => (
                <div key={item._id} className="dashboard-history-item">
                  <div className="dashboard-history-header">
                    <div className="dashboard-history-type">
                      {item.type === 'github_repo' ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                          </svg>
                          <span>GitHub Repo</span>
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                            <polyline points="13 2 13 9 20 9"></polyline>
                          </svg>
                          <span>File Upload</span>
                        </>
                      )}
                    </div>
                    <div 
                      className="dashboard-history-status" 
                      style={{ backgroundColor: getStatusColor(item.status) }}
                    >
                      {getStatusLabel(item.status)}
                    </div>
                  </div>
                  <div className="dashboard-history-content">
                    {item.repoUrl && (
                      <div className="dashboard-history-repo">
                        <strong>Repository:</strong> {item.repoUrl}
                      </div>
                    )}
                    {item.fileCount > 0 && (
                      <div className="dashboard-history-info">
                        <strong>Files:</strong> {item.fileCount}
                      </div>
                    )}
                    {item.repoInfo && (
                      <div className="dashboard-history-info">
                        <strong>Files Processed:</strong> {item.repoInfo.includedFiles || 0} / {item.repoInfo.totalFiles || 0}
                      </div>
                    )}
                    <div className="dashboard-history-date">
                      {formatDate(item.createdAt)}
                    </div>
                  </div>
                  {item.pdfUrl && (
                    <div className="dashboard-history-footer">
                      <a 
                        href={item.pdfUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="dashboard-history-link"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        View PDF
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;

