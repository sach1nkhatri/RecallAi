import React, { useMemo, useState } from 'react';
import '../css/CodeToDocPage.css';

const ProjectSelector = ({
  projects,
  activeProject,
  activeProjectId,
  onSelect,
  onCreate,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const options = useMemo(() => projects || [], [projects]);

  const handleSelect = (e) => {
    const nextId = e.target.value;
    if (!nextId) return;
    onSelect?.(nextId);
  };

  const handleCreateClick = () => {
    setShowCreateModal(true);
    setNewProjectName('');
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const name = newProjectName.trim();
    if (!name) return;
    onCreate?.(name);
    setShowCreateModal(false);
    setNewProjectName('');
  };

  const handleCreateCancel = () => {
    setShowCreateModal(false);
    setNewProjectName('');
  };

  return (
    <>
      <div className="ctd-project-selector">
        <div className="ctd-project-info">
          <span className="ctd-muted">Current:</span>
          <strong>{activeProject?.name || 'Unnamed project'}</strong>
        </div>
        <div className="ctd-project-actions">
          <select
            id="projectSelect"
            value={activeProjectId || ''}
            onChange={handleSelect}
            className="ctd-select"
          >
            {options.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={handleCreateClick} className="ctd-project-create">
            + New Project
          </button>
        </div>
      </div>

      {showCreateModal && (
        <div className="ctd-modal-overlay" onClick={handleCreateCancel}>
          <div className="ctd-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Project</h3>
            <form onSubmit={handleCreateSubmit}>
              <input
                type="text"
                placeholder="Project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                autoFocus
                className="ctd-modal-input"
              />
              <div className="ctd-modal-actions">
                <button type="button" onClick={handleCreateCancel} className="ctd-modal-cancel">
                  Cancel
                </button>
                <button type="submit" className="ctd-modal-submit" disabled={!newProjectName.trim()}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ProjectSelector;
