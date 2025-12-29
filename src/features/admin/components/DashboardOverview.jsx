import React, { useState, useEffect } from 'react';
import { getNodeApiBase } from '../../../core/utils/nodeApi';
import '../css/DashboardOverview.css';

const DashboardOverview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('adminToken');
      try {
        const response = await fetch(`${getNodeApiBase()}/api/admin/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setStats(data.stats);
          }
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="loading">Loading statistics...</div>;
  }

  if (!stats) {
    return <div className="error">Failed to load statistics</div>;
  }

  return (
    <div className="dashboard-overview">
      <h2>Dashboard Overview</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Total Users</h3>
            <p className="stat-value">{stats.users.total}</p>
            <div className="stat-breakdown">
              <span>Free: {stats.users.free}</span>
              <span>Pro: {stats.users.pro}</span>
              <span>Enterprise: {stats.users.enterprise}</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💳</div>
          <div className="stat-content">
            <h3>Payments</h3>
            <p className="stat-value">{stats.payments.pending} Pending</p>
            <div className="stat-breakdown">
              <span>Approved: {stats.payments.approved}</span>
              <span>Rejected: {stats.payments.rejected}</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>Reports</h3>
            <p className="stat-value">{stats.reports.total}</p>
            <div className="stat-breakdown">
              <span>Active: {stats.reports.active}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;

