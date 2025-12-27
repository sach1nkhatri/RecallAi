import React, { useState } from 'react';
import '../css/ReportModal.css';

const ReportModal = ({ isOpen, onClose }) => {
  const [reportType, setReportType] = useState('bug');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!subject.trim() || !description.trim()) {
      setSubmitStatus({ type: 'error', message: 'Please fill in all required fields' });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please login to submit a report');
      }

      const apiBase = process.env.REACT_APP_NODE_API_BASE_URL || 'http://localhost:5002';
      const response = await fetch(`${apiBase}/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: reportType,
          subject: subject.trim(),
          description: description.trim(),
          email: email.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit report');
      }

      setSubmitStatus({ type: 'success', message: 'Report submitted successfully! We\'ll get back to you soon.' });
      
      // Reset form after success
      setTimeout(() => {
        setSubject('');
        setDescription('');
        setEmail('');
        setReportType('bug');
        setSubmitStatus(null);
        onClose();
      }, 2000);
    } catch (error) {
      setSubmitStatus({ type: 'error', message: error.message || 'Failed to submit report. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSubject('');
      setDescription('');
      setEmail('');
      setReportType('bug');
      setSubmitStatus(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  const reportTypes = [
    { value: 'bug', label: 'Bug Report', description: 'Something is not working' },
    { value: 'feature', label: 'Feature Request', description: 'Suggest a new feature' },
    { value: 'improvement', label: 'Improvement', description: 'Improve existing feature' },
    { value: 'other', label: 'Other', description: 'General feedback' },
  ];

  return (
    <div className="report-modal-overlay" onClick={handleClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <div className="report-modal-header-content">
            <h2>Submit a Report</h2>
            <p>Help us improve by sharing your feedback</p>
          </div>
          <button
            className="report-modal-close"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="report-modal-form">
          <div className="report-modal-field">
            <label htmlFor="report-type">Report Type *</label>
            <div className="report-type-grid">
              {reportTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={`report-type-option ${reportType === type.value ? 'active' : ''}`}
                  onClick={() => setReportType(type.value)}
                >
                  <div className="report-type-label">{type.label}</div>
                  <div className="report-type-desc">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="report-modal-field">
            <label htmlFor="report-subject">Subject *</label>
            <input
              id="report-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your report"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="report-modal-field">
            <label htmlFor="report-description">Description *</label>
            <textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide as much detail as possible..."
              rows="6"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="report-modal-field">
            <label htmlFor="report-email">
              Your Email
              <span className="report-field-optional">(Optional - for follow-up)</span>
            </label>
            <input
              id="report-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              disabled={isSubmitting}
            />
          </div>

          {submitStatus && (
            <div className={`report-modal-status report-modal-status-${submitStatus.type}`}>
              {submitStatus.type === 'success' ? '✓' : '✕'} {submitStatus.message}
            </div>
          )}

          <div className="report-modal-actions">
            <button
              type="button"
              className="report-modal-cancel"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="report-modal-submit"
              disabled={isSubmitting || !subject.trim() || !description.trim()}
            >
              {isSubmitting ? (
                <>
                  <span className="report-modal-spinner"></span>
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;

