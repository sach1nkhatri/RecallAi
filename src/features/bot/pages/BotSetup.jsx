import React, { useState, useCallback, useMemo } from 'react';
import { useBot } from '../../../core/context/BotContext';
import Button from '../../../core/components/Button';
import InputField from '../../../core/components/InputField';
import Card from '../../../core/components/Card';
import Modal from '../../../core/components/Modal';
import Loader from '../../../core/components/Loader';
import '../css/BotSetup.css';

const BotSetup = () => {
  const { bots, loading, createBot, creating, error, clearError } = useBot();
  const [showForm, setShowForm] = useState(false);
  const [selectedBot, setSelectedBot] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [botToDelete, setBotToDelete] = useState(null);

  const handleShowForm = useCallback(() => {
    setShowForm(true);
    clearError();
  }, [clearError]);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setSelectedBot(null);
    clearError();
  }, [clearError]);

  const handleEditBot = useCallback((bot) => {
    setSelectedBot(bot);
    setShowForm(true);
  }, []);

  const handleDeleteClick = useCallback((bot) => {
    setBotToDelete(bot);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (botToDelete) {
      // Here you would call deleteBot from context
      console.log('Deleting bot:', botToDelete.id);
      setShowDeleteModal(false);
      setBotToDelete(null);
    }
  }, [botToDelete]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteModal(false);
    setBotToDelete(null);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setShowForm(false);
    setSelectedBot(null);
  }, []);

  // Memoize computed values
  const activeBots = useMemo(() => 
    bots.filter(bot => bot.status === 'active'), 
    [bots]
  );

  const trainingBots = useMemo(() => 
    bots.filter(bot => bot.status === 'training'), 
    [bots]
  );

  const inactiveBots = useMemo(() => 
    bots.filter(bot => bot.status === 'inactive'), 
    [bots]
  );

  if (loading) {
    return <Loader.Page message="Loading bot setup..." />;
  }

  return (
    <div className="bot-setup">
      {/* Header */}
      <div className="bot-setup-header">
        <div className="bot-setup-header-content">
          <h1 className="bot-setup-title">Bot Setup</h1>
          <p className="bot-setup-subtitle">Create, configure, and manage your AI bots</p>
        </div>
        <Button onClick={handleShowForm} className="shadow-lg hover:shadow-xl">
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create New Bot
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="bot-setup-stats">
        <div className="bot-setup-stat">
          <div className="bot-setup-stat-content">
            <div className="bot-setup-stat-icon bot-setup-stat-icon-blue">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="bot-setup-stat-info">
              <p className="bot-setup-stat-label">Total Bots</p>
              <p className="bot-setup-stat-number">{bots.length}</p>
            </div>
          </div>
        </div>

        <div className="bot-setup-stat">
          <div className="bot-setup-stat-content">
            <div className="bot-setup-stat-icon bot-setup-stat-icon-green">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="bot-setup-stat-info">
              <p className="bot-setup-stat-label">Active</p>
              <p className="bot-setup-stat-number">{activeBots.length}</p>
            </div>
          </div>
        </div>

        <div className="bot-setup-stat">
          <div className="bot-setup-stat-content">
            <div className="bot-setup-stat-icon bot-setup-stat-icon-orange">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="bot-setup-stat-info">
              <p className="bot-setup-stat-label">Training</p>
              <p className="bot-setup-stat-number">{trainingBots.length}</p>
            </div>
          </div>
        </div>

        <div className="bot-setup-stat">
          <div className="bot-setup-stat-content">
            <div className="bot-setup-stat-icon bot-setup-stat-icon-gray">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="bot-setup-stat-info">
              <p className="bot-setup-stat-label">Inactive</p>
              <p className="bot-setup-stat-number">{inactiveBots.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bot Creation/Edit Form */}
      {showForm && (
        <div className="bot-setup-form-container">
          <Card>
            <Card.Header>
              <Card.Title>{selectedBot ? 'Edit Bot' : 'Create New Bot'}</Card.Title>
              <Card.Description>
                {selectedBot 
                  ? 'Update your bot configuration and settings'
                  : 'Set up a new AI bot by providing a name, description, and uploading your documents.'
                }
              </Card.Description>
            </Card.Header>
            
            <BotSetupForm 
              bot={selectedBot}
              onSuccess={handleFormSuccess}
              onCancel={handleCloseForm}
            />
          </Card>
        </div>
      )}

      {/* Bots List */}
      {bots.length === 0 ? (
        <div className="bot-setup-empty">
          <div className="bot-setup-empty-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="bot-setup-empty-title">No bots created yet</h3>
          <p className="bot-setup-empty-description">
            Get started by creating your first AI bot and transform your documents into intelligent conversational agents.
          </p>
          <Button onClick={handleShowForm} size="lg" className="shadow-lg hover:shadow-xl">
            <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Your First Bot
          </Button>
        </div>
      ) : (
        <div className="bot-setup-content">
          {/* Active Bots */}
          {activeBots.length > 0 && (
            <div className="bot-setup-section">
              <h2 className="bot-setup-section-title">
                <span className="bot-setup-section-icon bot-setup-section-icon-green">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </span>
                Active Bots ({activeBots.length})
              </h2>
              <div className="bot-setup-grid">
                {activeBots.map((bot) => (
                  <BotSetupCard 
                    key={bot.id} 
                    bot={bot} 
                    onEdit={handleEditBot}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Training Bots */}
          {trainingBots.length > 0 && (
            <div className="bot-setup-section">
              <h2 className="bot-setup-section-title">
                <span className="bot-setup-section-icon bot-setup-section-icon-orange">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                Training Bots ({trainingBots.length})
              </h2>
              <div className="bot-setup-grid">
                {trainingBots.map((bot) => (
                  <BotSetupCard 
                    key={bot.id} 
                    bot={bot} 
                    onEdit={handleEditBot}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Inactive Bots */}
          {inactiveBots.length > 0 && (
            <div className="bot-setup-section">
              <h2 className="bot-setup-section-title">
                <span className="bot-setup-section-icon bot-setup-section-icon-gray">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                Inactive Bots ({inactiveBots.length})
              </h2>
              <div className="bot-setup-grid">
                {inactiveBots.map((bot) => (
                  <BotSetupCard 
                    key={bot.id} 
                    bot={bot} 
                    onEdit={handleEditBot}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        title="Delete Bot"
        size="sm"
      >
        <div className="bot-setup-delete-modal">
          <p className="bot-setup-delete-message">
            Are you sure you want to delete <strong>{botToDelete?.name}</strong>? 
            This action cannot be undone.
          </p>
          <div className="bot-setup-delete-actions">
            <Button variant="outline" onClick={handleDeleteCancel}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              Delete Bot
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Bot Setup Form Component
const BotSetupForm = ({ bot, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: bot?.name || '',
    description: bot?.description || '',
    files: null
  });
  const [errors, setErrors] = useState({});
  
  const { createBot, creating, error, clearError } = useBot();

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) clearError();
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  }, [error, clearError, errors]);

  const handleFileChange = useCallback((e) => {
    const files = e.target.files;
    setFormData(prev => ({
      ...prev,
      files: files
    }));
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Bot name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Bot name must be at least 2 characters';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Bot name must be less than 50 characters';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const result = await createBot({
      name: formData.name.trim(),
      description: formData.description.trim(),
      files: formData.files
    });
    
    if (result.success) {
      setFormData({ name: '', description: '', files: null });
      if (onSuccess) onSuccess();
    }
  }, [formData, validateForm, createBot, onSuccess]);

  return (
    <form onSubmit={handleSubmit} className="bot-setup-form">
      {error && (
        <div className="bot-setup-form-error">
          <p className="bot-setup-form-error-text">{error}</p>
        </div>
      )}
      
      <InputField
        label="Bot Name"
        name="name"
        type="text"
        value={formData.name}
        onChange={handleChange}
        error={errors.name}
        required
        placeholder="e.g., Customer Support Assistant"
      />
      
      <div>
        <label htmlFor="description" className="bot-setup-form-textarea-label">
          Description <span className="bot-setup-form-textarea-required">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe what this bot will do and what kind of questions it should answer..."
          className={`bot-setup-form-textarea ${errors.description ? 'bot-setup-form-textarea-error' : ''}`}
        />
        {errors.description && (
          <p className="bot-setup-form-textarea-error-message">{errors.description}</p>
        )}
        <p className="bot-setup-form-textarea-counter">
          {formData.description.length}/500 characters
        </p>
      </div>
      
      <InputField
        label="Upload Documents"
        name="files"
        type="file"
        onChange={handleFileChange}
        multiple
        accept=".pdf,.doc,.docx,.txt,.md"
      />
      
      <div className="bot-setup-form-info">
        <div className="bot-setup-form-info-content">
          <div className="bot-setup-form-info-icon">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="bot-setup-form-info-text">
            <h3 className="bot-setup-form-info-title">
              Supported file types
            </h3>
            <div className="bot-setup-form-info-description">
              <p>Upload PDF, Word documents, or text files. Maximum file size: 10MB per file.</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bot-setup-form-actions">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={creating}
        >
          {bot ? 'Update Bot' : 'Create Bot'}
        </Button>
      </div>
    </form>
  );
};

// Bot Setup Card Component
const BotSetupCard = ({ bot, onEdit, onDelete }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bot-setup-card-status-active';
      case 'training': return 'bot-setup-card-status-training';
      case 'inactive': return 'bot-setup-card-status-inactive';
      default: return 'bot-setup-card-status-inactive';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return (
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'training':
        return (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <Card className="bot-setup-card">
      <Card.Header>
        <div className="bot-setup-card-header">
          <div className="bot-setup-card-info">
            <h3 className="bot-setup-card-title">{bot.name}</h3>
            <div className={`bot-setup-card-status ${getStatusColor(bot.status)}`}>
              <span className="bot-setup-card-status-icon">
                {getStatusIcon(bot.status)}
              </span>
              <span className="bot-setup-card-status-text">{bot.status}</span>
            </div>
          </div>
          <div className="bot-setup-card-actions">
            <button 
              onClick={() => onEdit(bot)}
              className="bot-setup-card-action bot-setup-card-action-edit"
              title="Edit Bot"
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button 
              onClick={() => onDelete(bot)}
              className="bot-setup-card-action bot-setup-card-action-delete"
              title="Delete Bot"
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </Card.Header>
      
      <Card.Content>
        <p className="bot-setup-card-description">{bot.description}</p>
        
        <div className="bot-setup-card-stats">
          <div className="bot-setup-card-stat">
            <span className="bot-setup-card-stat-label">Documents:</span>
            <span className="bot-setup-card-stat-value">{bot.documents}</span>
          </div>
          <div className="bot-setup-card-stat">
            <span className="bot-setup-card-stat-label">Queries:</span>
            <span className="bot-setup-card-stat-value">{bot.queries}</span>
          </div>
        </div>
        
        <div className="bot-setup-card-meta">
          <span className="bot-setup-card-created">
            Created {new Date(bot.createdAt).toLocaleDateString()}
          </span>
        </div>
      </Card.Content>
    </Card>
  );
};

export default BotSetup;
