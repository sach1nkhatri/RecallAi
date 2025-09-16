import React from 'react';
import { Link } from 'react-router-dom';
import './CTASection.css';

const CTASection = () => {
  return (
    <section className="cta-section">
      {/* Background decoration */}
      <div className="cta-background">
        <div className="cta-background-pattern"></div>
        <div className="cta-blob-1"></div>
        <div className="cta-blob-2"></div>
      </div>
      
      <div className="cta-container">
        {/* Badge
        <div className="cta-badge" style={{ animation: 'fadeInUp 0.8s ease-out' }}>
          <div className="cta-badge-dot"></div>
          <span className="cta-badge-text">Join the AI Revolution</span>
        </div> */}
        
        <h2 className="cta-title" style={{ animation: 'fadeInUp 1s ease-out 0.2s both' }}>
          Ready to build your first
          <span className="cta-title-gradient">
            AI bot?
          </span>
        </h2>
        
        <p className="cta-description" style={{ animation: 'fadeInUp 1s ease-out 0.4s both' }}>
          Join thousands of developers who are already creating intelligent conversational agents with Recall AI.
          <span className="cta-description-highlight">Start building in minutes, not hours.</span>
        </p>
        
        <div className="cta-actions" style={{ animation: 'fadeInUp 1s ease-out 0.6s both' }}>
          <Link to="/signup" className="cta-primary-button" style={{ animation: 'scaleIn 0.6s ease-out 0.8s both' }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Start Building Free
          </Link>
          <Link to="/login" className="cta-secondary-button" style={{ animation: 'scaleIn 0.6s ease-out 1s both' }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Sign In
          </Link>
        </div>
        
        {/* Enhanced Stats */}
        <div className="cta-stats" style={{ animation: 'fadeInUp 1s ease-out 1.2s both' }}>
          <div className="cta-stat-item" style={{ animation: 'slideInFromLeft 0.6s ease-out 1.4s both' }}>
            <div className="cta-stat-card">
              <div className="cta-stat-number">
                10K+
              </div>
              <div className="cta-stat-label">Active Users</div>
              <div className="cta-stat-sublabel">Growing daily</div>
            </div>
          </div>
          <div className="cta-stat-item" style={{ animation: 'scaleIn 0.6s ease-out 1.6s both' }}>
            <div className="cta-stat-card">
              <div className="cta-stat-number">
                50K+
              </div>
              <div className="cta-stat-label">Documents Processed</div>
              <div className="cta-stat-sublabel">And counting</div>
            </div>
          </div>
          <div className="cta-stat-item" style={{ animation: 'slideInFromRight 0.6s ease-out 1.8s both' }}>
            <div className="cta-stat-card">
              <div className="cta-stat-number">
                99.9%
              </div>
              <div className="cta-stat-label">Uptime</div>
              <div className="cta-stat-sublabel">Reliable & fast</div>
            </div>
          </div>
        </div>
        
        {/* Trust indicators */}
        <div className="cta-trust">
          <p className="cta-trust-text">Trusted by developers at</p>
          <div className="cta-trust-logos">
            <div className="cta-trust-logo">TechCorp</div>
            <div className="cta-trust-logo">InnovateLab</div>
            <div className="cta-trust-logo">DataFlow</div>
            <div className="cta-trust-logo">CloudSync</div>
            <div className="cta-trust-logo">AI Solutions</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;