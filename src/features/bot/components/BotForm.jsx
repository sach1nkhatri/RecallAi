import React, { useState } from 'react';
import { useBot } from '../../../core/context/BotContext';
import Button from '../../../core/components/Button';
import InputField from '../../../core/components/InputField';
import Card from '../../../core/components/Card';
import '../css/BotForm.css';

const BotForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    files: null
  });
  const [errors, setErrors] = useState({});
  
  const { createBot, creating, error, clearError } = useBot();
  
  const handleChange = (e) => {
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
  };
  
  const handleFileChange = (e) => {
    const files = e.target.files;
    setFormData(prev => ({
      ...prev,
      files: files
    }));
  };
  
  const validateForm = () => {
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
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const result = await createBot({
      name: formData.name.trim(),
      description: formData.description.trim(),
      files: formData.files
    });
    
    if (result.success) {
      setFormData({ name: '', description: '', files: null });
      if (onSuccess) onSuccess(result.bot);
    }
  };
  
  return (
    <Card>
      <Card.Header>
        <Card.Title>Create New Bot</Card.Title>
        <Card.Description>
          Set up a new AI bot by providing a name, description, and uploading your documents.
        </Card.Description>
      </Card.Header>
      
      <form onSubmit={handleSubmit} className="bot-form">
        {error && (
          <div className="bot-form-error">
            <p className="bot-form-error-text">{error}</p>
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
          <label htmlFor="description" className="bot-form-textarea-label">
            Description <span className="bot-form-textarea-required">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe what this bot will do and what kind of questions it should answer..."
            className={`bot-form-textarea ${errors.description ? 'bot-form-textarea-error' : ''}`}
          />
          {errors.description && (
            <p className="bot-form-textarea-error-message">{errors.description}</p>
          )}
          <p className="bot-form-textarea-counter">
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
        
        <div className="bot-form-info">
          <div className="bot-form-info-content">
            <div className="bot-form-info-icon">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="bot-form-info-text">
              <h3 className="bot-form-info-title">
                Supported file types
              </h3>
              <div className="bot-form-info-description">
                <p>Upload PDF, Word documents, or text files. Maximum file size: 10MB per file.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bot-form-actions">
          <Button
            type="button"
            variant="outline"
            onClick={() => setFormData({ name: '', description: '', files: null })}
          >
            Clear
          </Button>
          <Button
            type="submit"
            loading={creating}
          >
            Create Bot
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default BotForm;
