import React from 'react';
import { Link } from 'react-router-dom';
import '../css/DashboardHome.css';

const DashboardHome = () => {
  return (
    <div className="dashboard-home">
      {/* Hero Section */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-content">
          <div className="dashboard-hero-badge">
            <span className="dashboard-hero-badge-icon">✨</span>
            <span>AI-Powered Platform</span>
          </div>
          <h1 className="dashboard-hero-title">
            Welcome back! 👋
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
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div className="dashboard-stat-content">
            <div className="dashboard-stat-value">Ready</div>
            <div className="dashboard-stat-label">System Status</div>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
          </div>
          <div className="dashboard-stat-content">
            <div className="dashboard-stat-value">Fast</div>
            <div className="dashboard-stat-label">Processing Speed</div>
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
            <div className="dashboard-stat-value">Secure</div>
            <div className="dashboard-stat-label">Data Protection</div>
          </div>
        </div>
      </div>

      {/* Main Features Grid */}
      <div className="dashboard-container">
        <div className="dashboard-section-header">
          <h2 className="dashboard-section-title">What would you like to do?</h2>
          <p className="dashboard-section-subtitle">Choose a tool to get started</p>
        </div>

        <div className="dashboard-features-grid">
          {/* Code to Document Card */}
          <Link to="/dashboard/code-to-doc" className="dashboard-feature-card dashboard-feature-primary">
            <div className="dashboard-feature-glow"></div>
            <div className="dashboard-feature-header">
              <div className="dashboard-feature-icon-wrapper">
                <div className="dashboard-feature-icon">📄</div>
              </div>
              <div className="dashboard-feature-badge">Popular</div>
            </div>
            <div className="dashboard-feature-content">
              <h3 className="dashboard-feature-title">Code to Document</h3>
              <p className="dashboard-feature-description">
                Transform your code into professional documentation. Upload files, generate docs, export as PDF.
              </p>
              <ul className="dashboard-feature-list">
                <li>✓ Multiple file support</li>
                <li>✓ Auto-documentation</li>
                <li>✓ PDF export</li>
              </ul>
            </div>
            <div className="dashboard-feature-footer">
              <span className="dashboard-feature-link">
                Get Started
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </div>
          </Link>

          {/* Bot Setup Card */}
          <Link to="/dashboard/bot-setup" className="dashboard-feature-card dashboard-feature-secondary">
            <div className="dashboard-feature-glow"></div>
            <div className="dashboard-feature-header">
              <div className="dashboard-feature-icon-wrapper">
                <div className="dashboard-feature-icon">🤖</div>
              </div>
              <div className="dashboard-feature-badge dashboard-feature-badge-new">New</div>
            </div>
            <div className="dashboard-feature-content">
              <h3 className="dashboard-feature-title">Custom Chatbot Builder</h3>
              <p className="dashboard-feature-description">
                Create intelligent chatbots powered by your documents. Upload files, configure your bot, start chatting.
              </p>
              <ul className="dashboard-feature-list">
                <li>✓ RAG-enabled</li>
                <li>✓ Document upload</li>
                <li>✓ Live preview</li>
              </ul>
            </div>
            <div className="dashboard-feature-footer">
              <span className="dashboard-feature-link">
                Create Bot
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </div>
          </Link>

          {/* Reports Card */}
          <div className="dashboard-feature-card dashboard-feature-coming-soon">
            <div className="dashboard-feature-header">
              <div className="dashboard-feature-icon-wrapper">
                <div className="dashboard-feature-icon">📊</div>
              </div>
              <div className="dashboard-feature-badge dashboard-feature-badge-soon">Soon</div>
            </div>
            <div className="dashboard-feature-content">
              <h3 className="dashboard-feature-title">Analytics & Reports</h3>
              <p className="dashboard-feature-description">
                Track usage, view insights, and analyze performance metrics for your projects and bots.
              </p>
              <ul className="dashboard-feature-list">
                <li>✓ Usage analytics</li>
                <li>✓ Performance metrics</li>
                <li>✓ Export reports</li>
              </ul>
            </div>
            <div className="dashboard-feature-footer">
              <span className="dashboard-feature-link dashboard-feature-link-disabled">
                Coming Soon
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="dashboard-tips">
        <div className="dashboard-tip">
          <div className="dashboard-tip-icon">💡</div>
          <div className="dashboard-tip-content">
            <strong>Pro Tip:</strong> Start with Code to Document to generate docs, then create a bot to answer questions about them!
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;

