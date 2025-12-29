import React, { useState, useEffect } from 'react';
import { getNodeApiBase } from '../../../core/utils/nodeApi';
import '../css/ReportManagement.css';

const ReportManagement = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    const token = localStorage.getItem('adminToken');
    
    try {
      const response = await fetch(`${getNodeApiBase()}/api/admin/reports`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setReports(data.reports || []);
        }
      } else {
        console.error('Failed to fetch reports:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-management">
      <div className="section-header">
        <h2>Report Management</h2>
      </div>

      {loading ? (
        <div className="loading">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="empty-state">
          <p>No reports found</p>
        </div>
      ) : (
        <div className="reports-table">
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Type</th>
                <th>Status</th>
                <th>User</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report._id}>
                  <td>{report.subject || 'Untitled Report'}</td>
                  <td>{report.type || 'N/A'}</td>
                  <td>
                    <span className={`status-badge status-${report.status || 'open'}`}>
                      {report.status || 'open'}
                    </span>
                  </td>
                  <td>
                    {report.user?.name || 'N/A'}
                    <br />
                    <small>{report.user?.email}</small>
                  </td>
                  <td>{new Date(report.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="action-btn view">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReportManagement;

