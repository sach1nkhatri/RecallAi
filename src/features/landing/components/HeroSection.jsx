import React from 'react';
import { Link } from 'react-router-dom';
import './HeroSection.css';

const HeroSection = () => {
  return (
    <section className="hero-section">
      {/* Apple-style gradient background */}
      <div className="hero-background"></div>
      
      {/* Subtle grid pattern */}
      <div className="hero-grid-pattern"></div>
      
      {/* Floating elements */}
      <div className="hero-floating-elements"></div>
      <div className="hero-floating-elements"></div>
      <div className="hero-floating-elements"></div>
      
      <div className="hero-container">
        <div className="hero-content">
          
          {/* Main headline */}
          <h1 className="hero-title" style={{ animation: 'fadeInUp 1s ease-out 0.2s both' }}>
            AI-Powered
            <span className="hero-gradient-text">
              Conversations
            </span>
          </h1>
          
          {/* Subtitle */}
          <p className="hero-subtitle" style={{ animation: 'fadeInUp 1s ease-out 0.4s both' }}>
            Transform your documents into intelligent chatbots that understand context, 
            provide accurate answers, and deliver exceptional user experiences.
          </p>
          
          {/* CTA Buttons */}
          <div className="hero-actions" style={{ animation: 'fadeInUp 1s ease-out 0.6s both' }}>
            <Link to="/signup" className="btn btn-primary btn-lg" style={{ animation: 'scaleIn 0.6s ease-out 0.8s both' }}>
              Get Started
            </Link>
            <Link to="/login" className="btn btn-outline btn-lg" style={{ animation: 'scaleIn 0.6s ease-out 1s both' }}>
              Sign In
            </Link>
          </div>
          
          {/* Chatbot Demo */}
          <div className="hero-demo" style={{ animation: 'fadeInUp 1s ease-out 0.8s both' }}>
            <div className="hero-chat-demo" style={{ animation: 'scaleIn 0.8s ease-out 1.2s both' }}>
              {/* Chat header */}
              <div className="hero-chat-header">
                <div className="hero-chat-header-content">
                  <div className="hero-chat-user">
                    <div className="hero-chat-avatar">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div className="hero-chat-user-info">
                      <h3>AI Assistant</h3>
                      <p>Online</p>
                    </div>
                  </div>
                  <div className="hero-chat-status">
                    <div className="hero-chat-status-dot"></div>
                    <span className="hero-chat-status-text">Active</span>
                  </div>
                </div>
              </div>
              
              {/* Chat messages */}
              <div className="hero-chat-messages">
                {/* User message */}
                <div className="hero-message-user">
                  <div className="hero-message-bubble hero-message-bubble-user">
                    <p>How can I improve my customer support?</p>
                  </div>
                </div>
                
                {/* AI response */}
                <div className="hero-message-ai">
                  <div className="hero-message-bubble hero-message-bubble-ai">
                    <p>
                      Based on your support documentation, here are 5 key strategies to improve customer support:
                    </p>
                    <div className="hero-message-list">
                      <div className="hero-message-list-item">
                        <div className="hero-message-list-dot"></div>
                        <p className="hero-message-list-text">Implement 24/7 AI chat support</p>
                      </div>
                      <div className="hero-message-list-item">
                        <div className="hero-message-list-dot"></div>
                        <p className="hero-message-list-text">Create comprehensive knowledge base</p>
                      </div>
                      <div className="hero-message-list-item">
                        <div className="hero-message-list-dot"></div>
                        <p className="hero-message-list-text">Train agents on product expertise</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Typing indicator */}
                <div className="hero-typing-indicator">
                  <div className="hero-typing-dots">
                    <div className="hero-typing-dot"></div>
                    <div className="hero-typing-dot"></div>
                    <div className="hero-typing-dot"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="hero-stats" style={{ animation: 'fadeInUp 1s ease-out 1.4s both' }}>
            <div className="hero-stat-item" style={{ animation: 'slideInFromLeft 0.6s ease-out 1.6s both' }}>
              <div className="hero-stat-number">10K+</div>
              <div className="hero-stat-label">Active Users</div>
            </div>
            <div className="hero-stat-item" style={{ animation: 'slideInFromLeft 0.6s ease-out 1.8s both' }}>
              <div className="hero-stat-number">50K+</div>
              <div className="hero-stat-label">Documents</div>
            </div>
            <div className="hero-stat-item" style={{ animation: 'slideInFromRight 0.6s ease-out 2s both' }}>
              <div className="hero-stat-number">99.9%</div>
              <div className="hero-stat-label">Uptime</div>
            </div>
            <div className="hero-stat-item" style={{ animation: 'slideInFromRight 0.6s ease-out 2.2s both' }}>
              <div className="hero-stat-number">24/7</div>
              <div className="hero-stat-label">Support</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;