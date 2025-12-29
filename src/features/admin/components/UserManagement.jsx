import React, { useState, useEffect } from 'react';
import { getNodeApiBase } from '../../../core/utils/nodeApi';
import '../css/UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    plan: '',
    status: '',
    search: '',
    page: 1,
  });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const fetchUsers = async () => {
    setLoading(true);
    const token = localStorage.getItem('adminToken');
    
    try {
      const params = new URLSearchParams();
      if (filters.plan) params.append('plan', filters.plan);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      params.append('page', filters.page);
      params.append('limit', '20');

      const response = await fetch(`${getNodeApiBase()}/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUsers(data.users);
          setPagination({
            total: data.total,
            totalPages: data.totalPages,
            currentPage: data.currentPage,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlan = async (userId, newPlan) => {
    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch(`${getNodeApiBase()}/api/admin/users/${userId}/plan`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: newPlan }),
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to update plan:', error);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch(`${getNodeApiBase()}/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  return (
    <div className="user-management">
      <div className="section-header">
        <h2>User Management</h2>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
          className="search-input"
        />
        <select
          value={filters.plan}
          onChange={(e) => setFilters({ ...filters, plan: e.target.value, page: 1 })}
          className="filter-select"
        >
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          className="filter-select"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading users...</div>
      ) : (
        <>
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <select
                        value={user.plan}
                        onChange={(e) => handleUpdatePlan(user._id, e.target.value)}
                        className="plan-select"
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </td>
                    <td>
                      <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={() => handleToggleStatus(user._id, user.isActive)}
                        className={`action-btn ${user.isActive ? 'disable' : 'enable'}`}
                      >
                        {user.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={filters.page === 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              >
                Previous
              </button>
              <span>
                Page {filters.page} of {pagination.totalPages}
              </span>
              <button
                disabled={filters.page >= pagination.totalPages}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserManagement;

