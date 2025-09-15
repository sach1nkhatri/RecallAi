import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useBot } from '../../../core/context/BotContext';
import BotForm from '../components/BotForm';
import BotCard from '../components/BotCard';
import Button from '../../../core/components/Button';
import Loader from '../../../core/components/Loader';
import './BotDashboard.css';

const BotDashboard = () => {
  const [showForm, setShowForm] = useState(false);
  const { bots, loading, fetchBots } = useBot();
  
  useEffect(() => {
    fetchBots();
  }, [fetchBots]);
  
  const handleFormSuccess = useCallback(() => {
    setShowForm(false);
  }, []);
  
  const handleShowForm = useCallback(() => {
    setShowForm(true);
  }, []);
  
  // Memoize computed values to prevent unnecessary recalculations
  const activeBotsCount = useMemo(() => 
    bots.filter(bot => bot.status === 'active').length, 
    [bots]
  );
  
  const totalDocuments = useMemo(() => 
    bots.reduce((sum, bot) => sum + bot.documents, 0), 
    [bots]
  );
  
  const totalQueries = useMemo(() => 
    bots.reduce((sum, bot) => sum + bot.queries, 0), 
    [bots]
  );
  
  if (loading) {
    return <Loader.Page message="Loading your bots..." />;
  }
  
  return (
    <div className="bot-dashboard">
      {/* Header */}
      <div className="bot-dashboard-header">
        <div className="bot-dashboard-header-content">
          <h1 className="bot-dashboard-title">My Bots</h1>
          <p className="bot-dashboard-subtitle">Create and manage your AI-powered conversational agents</p>
        </div>
        <Button onClick={handleShowForm} className="shadow-lg hover:shadow-xl">
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Bot
        </Button>
      </div>
      
      {/* Bot Creation Form */}
      {showForm && (
        <div className="bot-dashboard-form-container">
          <BotForm onSuccess={handleFormSuccess} />
        </div>
      )}
      
      {/* Bots Grid */}
      {bots.length === 0 ? (
        <div className="bot-dashboard-empty">
          <div className="bot-dashboard-empty-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="bot-dashboard-empty-title">No bots yet</h3>
          <p className="bot-dashboard-empty-description">Get started by creating your first AI bot and transform your documents into intelligent conversational agents.</p>
          <Button onClick={handleShowForm} size="lg" className="shadow-lg hover:shadow-xl">
            <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Your First Bot
          </Button>
        </div>
      ) : (
        <div className="bot-dashboard-grid">
          {bots.map((bot) => (
            <BotCard key={bot.id} bot={bot} />
          ))}
        </div>
      )}
      
      {/* Quick Stats */}
      {bots.length > 0 && (
        <div className="bot-dashboard-stats">
          <div className="bot-dashboard-stat">
            <div className="bot-dashboard-stat-content">
              <div className="bot-dashboard-stat-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="bot-dashboard-stat-info">
                <p className="bot-dashboard-stat-label">Total Bots</p>
                <p className="bot-dashboard-stat-number">{bots.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bot-dashboard-stat bot-dashboard-stat-green">
            <div className="bot-dashboard-stat-content">
              <div className="bot-dashboard-stat-icon">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="bot-dashboard-stat-info">
                <p className="bot-dashboard-stat-label">Active Bots</p>
                <p className="bot-dashboard-stat-number">
                  {activeBotsCount}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bot-dashboard-stat bot-dashboard-stat-purple">
            <div className="bot-dashboard-stat-content">
              <div className="bot-dashboard-stat-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="bot-dashboard-stat-info">
                <p className="bot-dashboard-stat-label">Total Documents</p>
                <p className="bot-dashboard-stat-number">
                  {totalDocuments}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bot-dashboard-stat bot-dashboard-stat-orange">
            <div className="bot-dashboard-stat-content">
              <div className="bot-dashboard-stat-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="bot-dashboard-stat-info">
                <p className="bot-dashboard-stat-label">Total Queries</p>
                <p className="bot-dashboard-stat-number">
                  {totalQueries}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotDashboard;
