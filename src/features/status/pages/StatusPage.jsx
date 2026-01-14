import React, { useState, useEffect } from 'react';
import './StatusPage.css';

const StatusPage = () => {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchStatus = async () => {
    try {
      const getBackendApiBase = () => {
        if (typeof window === 'undefined') return 'http://localhost:5001';
        const envApi = process.env.REACT_APP_API_BASE_URL;
        if (envApi) return envApi;
        return window.location.port === '3000' || !window.location.port
          ? 'http://localhost:5001'
          : window.location.origin.replace(window.location.port, '5001');
      };

      const apiBase = getBackendApiBase();
      const response = await fetch(`${apiBase}/api/status`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }
      
      const data = await response.json();
      setStatusData(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Status fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getOverallStatus = () => {
    if (!statusData?.services) return { status: 'operational', message: "We're fully operational" };
    
    const services = statusData.services;
    const allHealthy = 
      services.web?.status === 'healthy' &&
      services.python_backend?.status === 'healthy' &&
      services.node_backend?.status === 'healthy' &&
      services.mongodb?.status === 'healthy';
    
    if (allHealthy) {
      return { status: 'operational', message: "We're fully operational" };
    }
    return { status: 'degraded', message: "Some systems are experiencing issues" };
  };

  // Use real data from backend API
  const getUptimePercentage = (service) => {
    return service?.uptime_percentage || 0;
  };

  const getUptimeHistory = (service) => {
    return service?.uptime_history || [];
  };

  const getComponentCount = (service) => {
    return service?.component_count || 0;
  };

  if (loading) {
    return (
      <div className="status-page-openai">
        <div className="status-container">
          <div className="status-loading">
            <div className="spinner"></div>
            <p>Loading system status...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !statusData) {
    return (
      <div className="status-page-openai">
        <div className="status-container">
          <div className="status-error">
            <h2>Error Loading Status</h2>
            <p>{error}</p>
            <button onClick={fetchStatus} className="retry-btn">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  const overallStatus = getOverallStatus();
  const services = statusData?.services || {};

  return (
    <div className="status-page-openai">
      <div className="status-container">
        {/* Header */}
        <div className="status-header">
          <div className="status-logo">
            <h1>Recall AI</h1>
          </div>
        </div>

        {/* Overall Status Box */}
        <div className={`overall-status-box ${overallStatus.status}`}>
          <div className="status-text">
            <h2>{overallStatus.message}</h2>
            <p>We're not aware of any issues affecting our systems.</p>
          </div>
        </div>

        {/* System Status Section */}
        <div className="system-status-section">
          <div className="section-header">
            <h3>System status</h3>
            <div className="date-range">
              <button className="date-nav">‹</button>
              <span>Oct 2025 - Jan 2026</span>
              <button className="date-nav">›</button>
            </div>
          </div>

          {/* Service Cards */}
          <div className="service-cards">
            {/* Web Frontend */}
            <div className="service-card">
              <div className="service-header">
                <div className="service-name">
                  <span>Web Frontend</span>
                </div>
                <div className="service-meta">
                  <span className="component-count">{getComponentCount(services.web)} components</span>
                </div>
              </div>
              <div className="service-uptime">
                <div className="uptime-bars">
                  {getUptimeHistory(services.web).map((color, idx) => (
                    <div key={idx} className={`uptime-bar ${color}`}></div>
                  ))}
                </div>
                <span className="uptime-percentage">
                  {getUptimePercentage(services.web).toFixed(2)}% uptime
                </span>
              </div>
            </div>

            {/* Python Backend */}
            <div className="service-card">
              <div className="service-header">
                <div className="service-name">
                  <span>Python Backend</span>
                </div>
                <div className="service-meta">
                  <span className="component-count">{getComponentCount(services.python_backend)} components</span>
                </div>
              </div>
              <div className="service-uptime">
                <div className="uptime-bars">
                  {getUptimeHistory(services.python_backend).map((color, idx) => (
                    <div key={idx} className={`uptime-bar ${color}`}></div>
                  ))}
                </div>
                <span className="uptime-percentage">
                  {getUptimePercentage(services.python_backend).toFixed(2)}% uptime
                </span>
              </div>
            </div>

            {/* Node.js Backend */}
            <div className="service-card">
              <div className="service-header">
                <div className="service-name">
                  <span>Node.js Backend</span>
                </div>
                <div className="service-meta">
                  <span className="component-count">{getComponentCount(services.node_backend)} components</span>
                </div>
              </div>
              <div className="service-uptime">
                <div className="uptime-bars">
                  {getUptimeHistory(services.node_backend).map((color, idx) => (
                    <div key={idx} className={`uptime-bar ${color}`}></div>
                  ))}
                </div>
                <span className="uptime-percentage">
                  {getUptimePercentage(services.node_backend).toFixed(2)}% uptime
                </span>
              </div>
            </div>

            {/* MongoDB */}
            <div className="service-card">
              <div className="service-header">
                <div className="service-name">
                  <span>MongoDB</span>
                </div>
                <div className="service-meta">
                  <span className="component-count">{getComponentCount(services.mongodb)} components</span>
                </div>
              </div>
              <div className="service-uptime">
                <div className="uptime-bars">
                  {getUptimeHistory(services.mongodb).map((color, idx) => (
                    <div key={idx} className={`uptime-bar ${color}`}></div>
                  ))}
                </div>
                <span className="uptime-percentage">
                  {getUptimePercentage(services.mongodb).toFixed(2)}% uptime
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="status-footer">
          <p>Last updated: {lastUpdated.toLocaleString()}</p>
          <button onClick={fetchStatus} className="refresh-btn">Refresh</button>
        </div>
      </div>
    </div>
  );
};

export default StatusPage;
