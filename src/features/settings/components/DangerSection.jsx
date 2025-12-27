import React, { useState } from 'react';
import '../css/DangerSection.css';

const DangerSection = ({ onDeleteAllBots, onDeleteCodeToDocHistory, onDeleteAccount, isLoading }) => {
  const [confirmDelete, setConfirmDelete] = useState({
    bots: false,
    codeToDoc: false,
    account: false,
  });
  const [deleteInput, setDeleteInput] = useState({
    bots: '',
    codeToDoc: '',
    account: '',
  });

  const handleDeleteClick = (type) => {
    setConfirmDelete((prev) => ({ ...prev, [type]: true }));
  };

  const handleCancelDelete = (type) => {
    setConfirmDelete((prev) => ({ ...prev, [type]: false }));
    setDeleteInput((prev) => ({ ...prev, [type]: '' }));
  };

  const handleConfirmDelete = async (type) => {
    const confirmText = {
      bots: 'DELETE ALL BOTS',
      codeToDoc: 'DELETE HISTORY',
      account: 'DELETE ACCOUNT',
    };

    if (deleteInput[type] !== confirmText[type]) {
      alert(`Please type "${confirmText[type]}" to confirm`);
      return;
    }

    try {
      if (type === 'bots') {
        await onDeleteAllBots();
      } else if (type === 'codeToDoc') {
        await onDeleteCodeToDocHistory();
      } else if (type === 'account') {
        await onDeleteAccount();
      }
      handleCancelDelete(type);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const dangerActions = [
    {
      id: 'bots',
      title: 'Delete All Bots',
      description: 'Permanently delete all your bots and their associated data. This action cannot be undone.',
      confirmText: 'DELETE ALL BOTS',
      buttonText: 'Delete All Bots',
      buttonClass: 'danger-btn-danger',
    },
    {
      id: 'codeToDoc',
      title: 'Delete Code to Doc History',
      description: 'Permanently delete all your code to document generation history. This action cannot be undone.',
      confirmText: 'DELETE HISTORY',
      buttonText: 'Delete History',
      buttonClass: 'danger-btn-warning',
    },
    {
      id: 'account',
      title: 'Delete Account',
      description: 'Permanently delete your account and all associated data. This action cannot be undone.',
      confirmText: 'DELETE ACCOUNT',
      buttonText: 'Delete Account',
      buttonClass: 'danger-btn-critical',
    },
  ];

  return (
    <div className="settings-section settings-section-danger">
      <div className="settings-section-header">
        <div>
          <h2>Danger Zone</h2>
          <p>Irreversible and destructive actions</p>
        </div>
      </div>

      <div className="danger-actions">
        {dangerActions.map((action) => (
          <div key={action.id} className="danger-action-item">
            <div className="danger-action-content">
              <h3 className="danger-action-title">{action.title}</h3>
              <p className="danger-action-description">{action.description}</p>
            </div>
            {!confirmDelete[action.id] ? (
              <button
                className={`danger-action-btn ${action.buttonClass}`}
                onClick={() => handleDeleteClick(action.id)}
                disabled={isLoading}
              >
                {action.buttonText}
              </button>
            ) : (
              <div className="danger-confirm-box">
                <div className="danger-confirm-warning">
                  <strong>Warning:</strong> This action cannot be undone!
                </div>
                <div className="danger-confirm-input-wrapper">
                  <label htmlFor={`confirm-${action.id}`}>
                    Type <strong>{action.confirmText}</strong> to confirm:
                  </label>
                  <input
                    id={`confirm-${action.id}`}
                    type="text"
                    value={deleteInput[action.id]}
                    onChange={(e) =>
                      setDeleteInput((prev) => ({ ...prev, [action.id]: e.target.value }))
                    }
                    placeholder={action.confirmText}
                    className="danger-confirm-input"
                    disabled={isLoading}
                  />
                </div>
                <div className="danger-confirm-actions">
                  <button
                    className="danger-confirm-cancel"
                    onClick={() => handleCancelDelete(action.id)}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    className={`danger-confirm-delete ${action.buttonClass}`}
                    onClick={() => handleConfirmDelete(action.id)}
                    disabled={isLoading || deleteInput[action.id] !== action.confirmText}
                  >
                    {isLoading ? 'Processing...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DangerSection;

