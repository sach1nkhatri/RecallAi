import React from 'react';
import '../css/UsageSection.css';

const UsageSection = ({ usage, plan }) => {
  const getUsagePercentage = (current, limit) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'var(--usage-danger)';
    if (percentage >= 70) return 'var(--usage-warning)';
    return 'var(--usage-success)';
  };

  const usageItems = [
    {
      label: 'Bots Created',
      current: usage.bots.current,
      limit: usage.bots.limit,
      unit: 'bot',
    },
    {
      label: 'Chats Today',
      current: usage.chats.today,
      limit: usage.chats.limit,
      unit: 'chat',
    },
    {
      label: 'Code to Doc Uses',
      current: usage.codeToDoc.used,
      limit: usage.codeToDoc.limit,
      unit: 'use',
    },
    {
      label: 'Tokens Used',
      current: usage.tokens.used,
      limit: usage.tokens.limit,
      unit: 'token',
      format: (val) => val.toLocaleString(),
    },
  ];

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <div>
          <h2>Usage Statistics</h2>
          <p>Track your current usage and limits</p>
        </div>
      </div>

      <div className="usage-grid">
        {usageItems.map((item, idx) => {
          const percentage = getUsagePercentage(item.current, item.limit);
          const color = getUsageColor(percentage);
          const displayValue = item.format ? item.format(item.current) : item.current;
          const displayLimit = item.limit === -1 ? 'Unlimited' : (item.format ? item.format(item.limit) : item.limit);

          return (
            <div key={idx} className="usage-card">
              <div className="usage-card-header">
                <span className="usage-label">{item.label}</span>
                <span className="usage-count">
                  {displayValue} / {displayLimit}
                </span>
              </div>
              {item.limit !== -1 && (
                <>
                  <div className="usage-progress-bar">
                    <div
                      className="usage-progress-fill"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <div className="usage-percentage">
                    {percentage.toFixed(0)}% used
                  </div>
                </>
              )}
              {item.limit === -1 && (
                <div className="usage-unlimited">Unlimited</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UsageSection;

