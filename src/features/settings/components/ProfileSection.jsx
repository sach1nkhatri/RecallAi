import React, { useState, useEffect } from 'react';
import '../css/ProfileSection.css';

const ProfileSection = ({ user, onUpdate, isLoading }) => {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Name is required');
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate({ name: name.trim(), email: email.trim() });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setIsEditing(false);
  };

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <div>
          <h2>Profile Information</h2>
          <p>Update your personal information</p>
        </div>
        {!isEditing && (
          <button
            className="settings-edit-btn"
            onClick={() => setIsEditing(true)}
            disabled={isLoading}
          >
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="settings-form">
          <div className="settings-field">
            <label htmlFor="profile-name">Full Name *</label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              disabled={isSaving}
            />
          </div>

          <div className="settings-field">
            <label htmlFor="profile-email">Email Address *</label>
            <input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              required
              disabled={isSaving}
            />
          </div>

          <div className="settings-form-actions">
            <button
              type="button"
              className="settings-cancel-btn"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="settings-save-btn"
              disabled={isSaving || !name.trim()}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <div className="settings-info-display">
          <div className="settings-info-item">
            <span className="settings-info-label">Full Name</span>
            <span className="settings-info-value">{user?.name || 'Not set'}</span>
          </div>
          <div className="settings-info-item">
            <span className="settings-info-label">Email Address</span>
            <span className="settings-info-value">{user?.email || 'Not set'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSection;

