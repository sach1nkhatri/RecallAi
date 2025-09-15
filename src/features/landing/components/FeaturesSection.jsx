import React from 'react';
import './FeaturesSection.css';

const FeaturesSection = () => {
  const features = [
    {
      icon: (
        <div className="features-icon features-icon-blue">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
      ),
      title: 'Intelligent Processing',
      description: 'Advanced AI automatically processes and indexes your documents for optimal retrieval and understanding.',
      color: 'blue'
    },
    {
      icon: (
        <div className="features-icon features-icon-purple">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      ),
      title: 'Natural Conversations',
      description: 'Chat with your documents using natural language. Get accurate, contextual answers powered by advanced RAG technology.',
      color: 'purple'
    },
    {
      icon: (
        <div className="features-icon features-icon-green">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      ),
      title: 'Lightning Fast',
      description: 'Get instant answers with our optimized retrieval system. No more waiting for slow AI responses.',
      color: 'green'
    },
    {
      icon: (
        <div className="features-icon features-icon-orange">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
      ),
      title: 'Analytics & Insights',
      description: 'Track usage, popular queries, and bot performance with detailed analytics and insights.',
      color: 'orange'
    },
    {
      icon: (
        <div className="features-icon features-icon-red">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      ),
      title: 'Enterprise Security',
      description: 'Your data is protected with enterprise-grade security, encryption, and compliance standards.',
      color: 'red'
    },
    {
      icon: (
        <div className="features-icon features-icon-indigo">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
        </div>
      ),
      title: 'Easy Customization',
      description: 'Customize your bot\'s personality, responses, and behavior to match your brand and use case.',
      color: 'indigo'
    }
  ];

  return (
    <section className="features-section">
      <div className="features-container">
        <div className="features-header">
          <div className="features-badge" style={{ animation: 'fadeInUp 0.8s ease-out' }}>
            <span className="features-badge-text">Powerful Features</span>
          </div>
          <h2 className="features-title" style={{ animation: 'fadeInUp 1s ease-out 0.2s both' }}>
            Everything you need to
            <span className="features-title-gradient">
              build intelligent bots
            </span>
          </h2>
          <p className="features-description" style={{ animation: 'fadeInUp 1s ease-out 0.4s both' }}>
            From document processing to natural conversations, our platform provides all the tools you need to create powerful RAG-powered AI assistants.
          </p>
        </div>
        
        <div className="features-grid">
          {features.map((feature, index) => (
            <div
              key={index}
              className="features-item"
              style={{
                animation: `scaleIn 0.6s ease-out ${0.6 + (index * 0.1)}s both`
              }}
            >
              <div className="features-card">
                {feature.icon}
                <h3 className="features-card-title">
                  {feature.title}
                </h3>
                <p className="features-card-description">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Bottom section */}
        <div className="features-footer">
          <div className="features-footer-content">
            <div className="features-footer-item">
              <div className="features-footer-dot"></div>
              <span className="features-footer-text">All features included</span>
            </div>
            <div className="features-footer-divider"></div>
            <div className="features-footer-item">
              <div className="features-footer-dot"></div>
              <span className="features-footer-text">No setup required</span>
            </div>
            <div className="features-footer-divider"></div>
            <div className="features-footer-item">
              <div className="features-footer-dot"></div>
              <span className="features-footer-text">Start building today</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;