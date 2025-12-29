import React, { useState, useEffect } from 'react';
import { getNodeApiBase } from '../../../core/utils/nodeApi';
import '../css/PaymentManagement.css';

const PaymentManagement = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    page: 1,
  });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    fetchPayments();
  }, [filters]);

  const fetchPayments = async () => {
    setLoading(true);
    const token = localStorage.getItem('adminToken');
    
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      params.append('page', filters.page);
      params.append('limit', '20');

      const response = await fetch(`${getNodeApiBase()}/api/admin/payments?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPayments(data.payments);
          setPagination({
            total: data.total,
            totalPages: data.totalPages,
            currentPage: data.currentPage,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (paymentId) => {
    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch(`${getNodeApiBase()}/api/admin/payments/${paymentId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminNotes }),
      });

      if (response.ok) {
        setSelectedPayment(null);
        setAdminNotes('');
        fetchPayments();
      }
    } catch (error) {
      console.error('Failed to approve payment:', error);
    }
  };

  const handleReject = async (paymentId) => {
    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch(`${getNodeApiBase()}/api/admin/payments/${paymentId}/reject`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminNotes }),
      });

      if (response.ok) {
        setSelectedPayment(null);
        setAdminNotes('');
        fetchPayments();
      }
    } catch (error) {
      console.error('Failed to reject payment:', error);
    }
  };

  const openPaymentModal = (payment) => {
    setSelectedPayment(payment);
    setAdminNotes(payment.adminNotes || '');
  };

  return (
    <div className="payment-management">
      <div className="section-header">
        <h2>Payment Management</h2>
      </div>

      <div className="filters">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          className="filter-select"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading payments...</div>
      ) : (
        <>
          <div className="payments-table">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Valid Until</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment._id}>
                    <td>
                      {payment.userId?.name || 'N/A'}
                      <br />
                      <small>{payment.userId?.email}</small>
                    </td>
                    <td>
                      <span className="plan-badge">{payment.plan}</span>
                      <br />
                      <small>{payment.planDuration}</small>
                    </td>
                    <td>NPR {payment.amount}</td>
                    <td>{payment.paymentMethod}</td>
                    <td>
                      <span className={`status-badge status-${payment.status}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                    <td>{new Date(payment.validUntil).toLocaleDateString()}</td>
                    <td>
                      {payment.status === 'pending' && (
                        <button
                          onClick={() => openPaymentModal(payment)}
                          className="action-btn review"
                        >
                          Review
                        </button>
                      )}
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

          {selectedPayment && (
            <div className="modal-overlay" onClick={() => setSelectedPayment(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>Review Payment</h3>
                <div className="payment-details">
                  <p><strong>User:</strong> {selectedPayment.userId?.name} ({selectedPayment.userId?.email})</p>
                  <p><strong>Plan:</strong> {selectedPayment.plan} - {selectedPayment.planDuration}</p>
                  <p><strong>Amount:</strong> NPR {selectedPayment.amount}</p>
                  <p><strong>Method:</strong> {selectedPayment.paymentMethod}</p>
                  <p><strong>Screenshot:</strong></p>
                  <img
                    src={`${getNodeApiBase()}${selectedPayment.screenshot.startsWith('/') ? '' : '/'}${selectedPayment.screenshot}`}
                    alt="Payment screenshot"
                    className="payment-screenshot"
                    onError={(e) => {
                      e.target.src = `${getNodeApiBase()}/uploads/payments/placeholder.png`;
                      e.target.alt = 'Screenshot not available';
                    }}
                  />
                </div>
                <div className="admin-notes-section">
                  <label>Admin Notes (optional):</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this payment..."
                    rows="3"
                  />
                </div>
                <div className="modal-actions">
                  <button
                    onClick={() => handleReject(selectedPayment._id)}
                    className="btn-reject"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedPayment._id)}
                    className="btn-approve"
                  >
                    Approve
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PaymentManagement;

