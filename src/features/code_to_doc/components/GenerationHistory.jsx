import React from 'react';
import '../css/GenerationHistory.css';

const formatDateTime = (iso) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const truncate = (text, limit = 200) => {
  if (!text) return '';
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
};

const GenerationHistory = ({ generations = [] }) => {
  return (
    <div className="ctd-history">
      <h3>Generation History</h3>
      {generations.length === 0 && (
        <div className="ctd-muted ctd-history-empty">No generations yet for this project.</div>
      )}
      <div className="ctd-history-list">
        {generations
          .slice()
          .reverse()
          .map((g) => (
            <div key={g.id} className="ctd-history-item">
              <div className="ctd-history-meta">
                <span className="ctd-history-date">{formatDateTime(g.createdAt)}</span>
              </div>
              <div className="ctd-history-prompt">
                <strong>Prompt:</strong> {truncate(g.prompt, 160) || '(empty)'}
              </div>
              <div className="ctd-history-output">
                <strong>Output:</strong> {truncate(g.output, 200) || '(no output)'}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default GenerationHistory;
