import React from 'react';
import { Link } from 'react-router-dom';
import '../css/PlanSection.css';

const PlanSection = ({ currentPlan, onUpgrade }) => {
  const planFeatures = {
    free: {
      name: 'Free Plan',
      bots: 1,
      chatsPerDay: 10,
      codeToDocUses: 2,
      tokens: 5000,
    },
    pro: {
      name: 'Pro Plan',
      bots: 10,
      chatsPerDay: 100,
      codeToDocUses: 50,
      tokens: 50000,
    },
    enterprise: {
      name: 'Enterprise Plan',
      bots: -1, // Unlimited
      chatsPerDay: -1,
      codeToDocUses: -1,
      tokens: -1,
    },
  };

  const currentPlanData = planFeatures[currentPlan] || planFeatures.free;

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <div>
          <h2>Subscription Plan</h2>
          <p>Manage your subscription and billing</p>
        </div>
      </div>

      <div className="plan-display">
        <div className="plan-badge">
          <span className="plan-badge-label">Current Plan</span>
          <span className="plan-badge-name">{currentPlanData.name}</span>
        </div>

        <div className="plan-features-list">
          <div className="plan-feature-item">
            <span className="plan-feature-label">Bots</span>
            <span className="plan-feature-value">
              {currentPlanData.bots === -1 ? 'Unlimited' : currentPlanData.bots}
            </span>
          </div>
          <div className="plan-feature-item">
            <span className="plan-feature-label">Chats per Day</span>
            <span className="plan-feature-value">
              {currentPlanData.chatsPerDay === -1 ? 'Unlimited' : currentPlanData.chatsPerDay}
            </span>
          </div>
          <div className="plan-feature-item">
            <span className="plan-feature-label">Code to Doc Uses</span>
            <span className="plan-feature-value">
              {currentPlanData.codeToDocUses === -1 ? 'Unlimited' : currentPlanData.codeToDocUses}
            </span>
          </div>
          <div className="plan-feature-item">
            <span className="plan-feature-label">Token Limit</span>
            <span className="plan-feature-value">
              {currentPlanData.tokens === -1 ? 'Unlimited' : `${currentPlanData.tokens.toLocaleString()}`}
            </span>
          </div>
        </div>

        {currentPlan === 'free' && (
          <div className="plan-upgrade">
            <p>Upgrade to unlock more features and higher limits</p>
            <Link to="/checkout" className="plan-upgrade-btn">
              Upgrade Plan
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanSection;

