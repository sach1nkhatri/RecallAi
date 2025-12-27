import React, { useEffect, useState } from 'react';
import '../css/Toast.css';

const Toast = ({ message, type = 'info' }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [message]);

  const getIcon = () => {
    switch (type) {
      case 'error':
        return '×';
      case 'success':
        return '✓';
      case 'warning':
        return '!';
      default:
        return 'i';
    }
  };

  if (!message) return null;

  return (
    <div className={`toast ${visible ? 'show' : ''} ${type}`}>
      <span className="toast-icon">{getIcon()}</span>
      <span className="toast-message">{message}</span>
      <button
        className="toast-close"
        onClick={() => setVisible(false)}
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
