import React from 'react';
import '../css/BotListCard.css';

const BotListCard = ({ bots, activeBotId, onSelect, onDelete, onCreateNew }) => {
  return (
    <div className="bot-list-card">
      <div className="bot-list-header">
        <h3>Your Bots</h3>
        <button className="bot-list-new-btn" onClick={onCreateNew}>
          + New Bot
        </button>
      </div>
      
      <div className="bot-list-items">
        {bots.length === 0 ? (
          <div className="bot-list-empty">
            <p>No bots yet. Create your first bot!</p>
          </div>
        ) : (
          bots.map((bot) => (
            <div
              key={bot.id}
              className={`bot-list-item ${activeBotId === bot.id ? 'active' : ''}`}
              onClick={() => onSelect(bot.id)}
            >
              <div className="bot-list-item-content">
                <div className="bot-list-item-icon">🤖</div>
                <div className="bot-list-item-info">
                  <h4>{bot.name || 'Unnamed Bot'}</h4>
                  <p className="bot-list-item-desc">
                    {bot.description || 'No description'}
                  </p>
                  <div className="bot-list-item-meta">
                    <span className="bot-list-item-docs">
                      {bot.documentCount || 0} docs
                    </span>
                    {bot.createdAt && (
                      <span className="bot-list-item-date">
                        {new Date(bot.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                className="bot-list-item-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(bot.id);
                }}
                aria-label="Delete bot"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BotListCard;

