import React, { useState, useEffect } from 'react';
import { getNodeApiBase } from '../../../core/utils/nodeApi';
import '../css/HelpFAQManagement.css';

const HelpFAQManagement = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState(null);
  const [formData, setFormData] = useState({
    category: 'general',
    question: '',
    answer: '',
    order: 0,
    isActive: true,
  });

  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    setLoading(true);
    const token = localStorage.getItem('adminToken');
    
    try {
      const response = await fetch(`${getNodeApiBase()}/api/admin/help-faq`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFaqs(data.faqs || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('adminToken');
    
    try {
      const url = editingFAQ
        ? `${getNodeApiBase()}/api/admin/help-faq/${editingFAQ._id}`
        : `${getNodeApiBase()}/api/admin/help-faq`;
      
      const method = editingFAQ ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowModal(false);
        setEditingFAQ(null);
        setFormData({
          category: 'general',
          question: '',
          answer: '',
          order: 0,
          isActive: true,
        });
        fetchFAQs();
      }
    } catch (error) {
      console.error('Failed to save FAQ:', error);
    }
  };

  const handleEdit = (faq) => {
    setEditingFAQ(faq);
    setFormData({
      category: faq.category,
      question: faq.question,
      answer: faq.answer,
      order: faq.order,
      isActive: faq.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (faqId) => {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) return;

    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch(`${getNodeApiBase()}/api/admin/help-faq/${faqId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchFAQs();
      }
    } catch (error) {
      console.error('Failed to delete FAQ:', error);
    }
  };

  const openNewModal = () => {
    setEditingFAQ(null);
    setFormData({
      category: 'general',
      question: '',
      answer: '',
      order: 0,
      isActive: true,
    });
    setShowModal(true);
  };

  return (
    <div className="help-faq-management">
      <div className="section-header">
        <h2>Help & FAQ Management</h2>
        <button onClick={openNewModal} className="btn-primary">
          + Add FAQ
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading FAQs...</div>
      ) : (
        <div className="faqs-list">
          {faqs.map((faq) => (
            <div key={faq._id} className="faq-item">
              <div className="faq-header">
                <span className="faq-category">{faq.category}</span>
                <span className={`faq-status ${faq.isActive ? 'active' : 'inactive'}`}>
                  {faq.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <h4>{faq.question}</h4>
              <p>{faq.answer}</p>
              <div className="faq-actions">
                <button onClick={() => handleEdit(faq)} className="btn-edit">
                  Edit
                </button>
                <button onClick={() => handleDelete(faq._id)} className="btn-delete">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingFAQ ? 'Edit FAQ' : 'Create FAQ'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="general">General</option>
                  <option value="billing">Billing</option>
                  <option value="technical">Technical</option>
                  <option value="account">Account</option>
                  <option value="features">Features</option>
                </select>
              </div>
              <div className="form-group">
                <label>Question</label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Answer</label>
                <textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  rows="5"
                  required
                />
              </div>
              <div className="form-group">
                <label>Order</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  Active
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  {editingFAQ ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpFAQManagement;

