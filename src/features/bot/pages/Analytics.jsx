import React, { useState, useCallback, useMemo } from 'react';
import { useBot } from '../../../core/context/BotContext';
import Card from '../../../core/components/Card';
import Button from '../../../core/components/Button';
import '../css/Analytics.css';

const Analytics = () => {
  const { bots, loading } = useBot();
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [selectedBot, setSelectedBot] = useState('all');

  const timeRanges = [
    { value: '1d', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ];

  const handleTimeRangeChange = useCallback((range) => {
    setSelectedTimeRange(range);
  }, []);

  const handleBotChange = useCallback((botId) => {
    setSelectedBot(botId);
  }, []);

  // Memoize computed analytics data
  const analyticsData = useMemo(() => {
    const filteredBots = selectedBot === 'all' ? bots : bots.filter(bot => bot.id === selectedBot);
    
    const totalQueries = filteredBots.reduce((sum, bot) => sum + bot.queries, 0);
    const totalDocuments = filteredBots.reduce((sum, bot) => sum + bot.documents, 0);
    const activeBots = filteredBots.filter(bot => bot.status === 'active').length;
    const averageQueriesPerBot = filteredBots.length > 0 ? Math.round(totalQueries / filteredBots.length) : 0;
    
    // Simulate time-based data (in a real app, this would come from an API)
    const generateTimeSeriesData = (days) => {
      const data = [];
      const today = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        data.push({
          date: date.toISOString().split('T')[0],
          queries: Math.floor(Math.random() * 100) + 20,
          documents: Math.floor(Math.random() * 10) + 5,
          users: Math.floor(Math.random() * 50) + 10
        });
      }
      return data;
    };

    const timeSeriesData = generateTimeSeriesData(
      selectedTimeRange === '1d' ? 1 :
      selectedTimeRange === '7d' ? 7 :
      selectedTimeRange === '30d' ? 30 :
      selectedTimeRange === '90d' ? 90 : 365
    );

    // Top performing bots
    const topBots = [...filteredBots]
      .sort((a, b) => b.queries - a.queries)
      .slice(0, 5);

    // Query trends
    const queryTrends = {
      total: totalQueries,
      change: Math.floor(Math.random() * 20) - 10, // Simulated change percentage
      trend: Math.random() > 0.5 ? 'up' : 'down'
    };

    // Document trends
    const documentTrends = {
      total: totalDocuments,
      change: Math.floor(Math.random() * 15) - 5,
      trend: Math.random() > 0.5 ? 'up' : 'down'
    };

    // User engagement
    const userEngagement = {
      total: Math.floor(totalQueries * 0.3), // Simulated user count
      change: Math.floor(Math.random() * 25) - 10,
      trend: Math.random() > 0.5 ? 'up' : 'down'
    };

    return {
      totalQueries,
      totalDocuments,
      activeBots,
      averageQueriesPerBot,
      timeSeriesData,
      topBots,
      queryTrends,
      documentTrends,
      userEngagement
    };
  }, [bots, selectedBot, selectedTimeRange]);

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="analytics-loading-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="analytics">
      {/* Header */}
      <div className="analytics-header">
        <div className="analytics-header-content">
          <h1 className="analytics-title">Analytics</h1>
          <p className="analytics-subtitle">Monitor your bot performance and usage metrics</p>
        </div>
        
        {/* Filters */}
        <div className="analytics-filters">
          <div className="analytics-filter-group">
            <label className="analytics-filter-label">Time Range</label>
            <select 
              value={selectedTimeRange} 
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              className="analytics-filter-select"
            >
              {timeRanges.map(range => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="analytics-filter-group">
            <label className="analytics-filter-label">Bot</label>
            <select 
              value={selectedBot} 
              onChange={(e) => handleBotChange(e.target.value)}
              className="analytics-filter-select"
            >
              <option value="all">All Bots</option>
              {bots.map(bot => (
                <option key={bot.id} value={bot.id}>
                  {bot.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="analytics-metrics">
        <div className="analytics-metric">
          <div className="analytics-metric-content">
            <div className="analytics-metric-icon analytics-metric-icon-blue">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="analytics-metric-info">
              <p className="analytics-metric-label">Total Queries</p>
              <p className="analytics-metric-number">{analyticsData.totalQueries.toLocaleString()}</p>
              <div className={`analytics-metric-change ${analyticsData.queryTrends.trend}`}>
                <span className="analytics-metric-change-icon">
                  {analyticsData.queryTrends.trend === 'up' ? '↗' : '↘'}
                </span>
                <span className="analytics-metric-change-text">
                  {Math.abs(analyticsData.queryTrends.change)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="analytics-metric">
          <div className="analytics-metric-content">
            <div className="analytics-metric-icon analytics-metric-icon-green">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="analytics-metric-info">
              <p className="analytics-metric-label">Total Documents</p>
              <p className="analytics-metric-number">{analyticsData.totalDocuments.toLocaleString()}</p>
              <div className={`analytics-metric-change ${analyticsData.documentTrends.trend}`}>
                <span className="analytics-metric-change-icon">
                  {analyticsData.documentTrends.trend === 'up' ? '↗' : '↘'}
                </span>
                <span className="analytics-metric-change-text">
                  {Math.abs(analyticsData.documentTrends.change)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="analytics-metric">
          <div className="analytics-metric-content">
            <div className="analytics-metric-icon analytics-metric-icon-purple">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="analytics-metric-info">
              <p className="analytics-metric-label">Active Users</p>
              <p className="analytics-metric-number">{analyticsData.userEngagement.total.toLocaleString()}</p>
              <div className={`analytics-metric-change ${analyticsData.userEngagement.trend}`}>
                <span className="analytics-metric-change-icon">
                  {analyticsData.userEngagement.trend === 'up' ? '↗' : '↘'}
                </span>
                <span className="analytics-metric-change-text">
                  {Math.abs(analyticsData.userEngagement.change)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="analytics-metric">
          <div className="analytics-metric-content">
            <div className="analytics-metric-icon analytics-metric-icon-orange">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="analytics-metric-info">
              <p className="analytics-metric-label">Active Bots</p>
              <p className="analytics-metric-number">{analyticsData.activeBots}</p>
              <div className="analytics-metric-change neutral">
                <span className="analytics-metric-change-icon">→</span>
                <span className="analytics-metric-change-text">0%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="analytics-charts">
        <div className="analytics-chart-row">
          {/* Query Trends Chart */}
          <Card className="analytics-chart-card">
            <Card.Header>
              <Card.Title>Query Trends</Card.Title>
              <Card.Description>Daily query volume over time</Card.Description>
            </Card.Header>
            <Card.Content>
              <div className="analytics-chart-container">
                <div className="analytics-chart-placeholder">
                  <div className="analytics-chart-placeholder-icon">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="analytics-chart-placeholder-text">Chart visualization would go here</p>
                  <p className="analytics-chart-placeholder-subtext">
                    {analyticsData.timeSeriesData.length} data points
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Top Performing Bots */}
          <Card className="analytics-chart-card">
            <Card.Header>
              <Card.Title>Top Performing Bots</Card.Title>
              <Card.Description>Bots with highest query volume</Card.Description>
            </Card.Header>
            <Card.Content>
              <div className="analytics-top-bots">
                {analyticsData.topBots.map((bot, index) => (
                  <div key={bot.id} className="analytics-top-bot">
                    <div className="analytics-top-bot-rank">
                      #{index + 1}
                    </div>
                    <div className="analytics-top-bot-info">
                      <h4 className="analytics-top-bot-name">{bot.name}</h4>
                      <p className="analytics-top-bot-queries">{bot.queries} queries</p>
                    </div>
                    <div className="analytics-top-bot-status">
                      <span className={`analytics-top-bot-status-badge ${bot.status}`}>
                        {bot.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        </div>

        <div className="analytics-chart-row">
          {/* User Engagement Chart */}
          <Card className="analytics-chart-card">
            <Card.Header>
              <Card.Title>User Engagement</Card.Title>
              <Card.Description>Daily active users over time</Card.Description>
            </Card.Header>
            <Card.Content>
              <div className="analytics-chart-container">
                <div className="analytics-chart-placeholder">
                  <div className="analytics-chart-placeholder-icon">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <p className="analytics-chart-placeholder-text">User engagement chart</p>
                  <p className="analytics-chart-placeholder-subtext">
                    {analyticsData.userEngagement.total} total users
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Document Usage Chart */}
          <Card className="analytics-chart-card">
            <Card.Header>
              <Card.Title>Document Usage</Card.Title>
              <Card.Description>Document access patterns</Card.Description>
            </Card.Header>
            <Card.Content>
              <div className="analytics-chart-container">
                <div className="analytics-chart-placeholder">
                  <div className="analytics-chart-placeholder-icon">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="analytics-chart-placeholder-text">Document usage chart</p>
                  <p className="analytics-chart-placeholder-subtext">
                    {analyticsData.totalDocuments} total documents
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="analytics-detailed-stats">
        <Card>
          <Card.Header>
            <Card.Title>Detailed Statistics</Card.Title>
            <Card.Description>Comprehensive performance metrics</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="analytics-stats-grid">
              <div className="analytics-stat-item">
                <div className="analytics-stat-item-header">
                  <h4 className="analytics-stat-item-title">Average Queries per Bot</h4>
                  <span className="analytics-stat-item-value">{analyticsData.averageQueriesPerBot}</span>
                </div>
                <p className="analytics-stat-item-description">
                  Mean query volume across all bots
                </p>
              </div>

              <div className="analytics-stat-item">
                <div className="analytics-stat-item-header">
                  <h4 className="analytics-stat-item-title">Query Success Rate</h4>
                  <span className="analytics-stat-item-value">94.2%</span>
                </div>
                <p className="analytics-stat-item-description">
                  Percentage of successful query responses
                </p>
              </div>

              <div className="analytics-stat-item">
                <div className="analytics-stat-item-header">
                  <h4 className="analytics-stat-item-title">Average Response Time</h4>
                  <span className="analytics-stat-item-value">1.2s</span>
                </div>
                <p className="analytics-stat-item-description">
                  Mean time to generate responses
                </p>
              </div>

              <div className="analytics-stat-item">
                <div className="analytics-stat-item-header">
                  <h4 className="analytics-stat-item-title">Peak Usage Hour</h4>
                  <span className="analytics-stat-item-value">2:00 PM</span>
                </div>
                <p className="analytics-stat-item-description">
                  Time of day with highest activity
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
