import React, { useState } from 'react';
import { useBot } from '../../../core/context/BotContext';
import Card from '../../../core/components/Card';
import Button from '../../../core/components/Button';
import Modal from '../../../core/components/Modal';
import '../css/BotCard.css';

const BotCard = ({ bot }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { deleteBot } = useBot();
  
  const getStatusClass = (status) => {
    switch (status) {
      case 'active':
        return 'bot-card-status-active';
      case 'training':
        return 'bot-card-status-training';
      case 'error':
        return 'bot-card-status-error';
      default:
        return 'bot-card-status-inactive';
    }
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return (
          <svg className="bot-card-status-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'training':
        return (
          <svg className="bot-card-status-icon bot-card-status-icon-spinning" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'error':
        return (
          <svg className="bot-card-status-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const handleDelete = async () => {
    const result = await deleteBot(bot.id);
    if (result.success) {
      setShowDeleteModal(false);
    }
  };
  
  return (
    <>
      <Card hover className="bot-card bot-card-gradient">
        <Card.Header>
          <div className="bot-card-title">
            <div className="bot-card-name">{bot.name}</div>
            <div className="bot-card-status">
              <span className={`bot-card-status ${getStatusClass(bot.status)}`}>
                {getStatusIcon(bot.status)}
                <span className="ml-2 capitalize">{bot.status}</span>
              </span>
            </div>
          </div>
        </Card.Header>
        
        <Card.Content>
          <Card.Description>
            {bot.description}
          </Card.Description>
          
          <div className="bot-card-stats">
            <div className="bot-card-stat">
              <div className="bot-card-stat-number">{bot.documents}</div>
              <div className="bot-card-stat-label">Documents</div>
            </div>
            <div className="bot-card-stat">
              <div className="bot-card-stat-number">{bot.queries}</div>
              <div className="bot-card-stat-label">Queries</div>
            </div>
          </div>
          
          <div className="bot-card-meta">
            <div className="bot-card-created">
              <svg className="bot-card-created-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Created {formatDate(bot.createdAt)}
            </div>
          </div>
        </Card.Content>
        
        <Card.Footer>
          <div className="bot-card-actions">
            <Button variant="outline" size="sm" className="bot-card-action bot-card-action-primary">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chat
            </Button>
            <Button variant="outline" size="sm" className="bot-card-action">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
              Settings
            </Button>
          </div>
        </Card.Footer>
      </Card>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Bot"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{bot.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default BotCard;
