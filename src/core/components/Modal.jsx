import React, { useEffect } from 'react';
import './Modal.css';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  className = '',
  ...props 
}) => {
  const sizes = {
    sm: 'modal-container-sm',
    md: 'modal-container',
    lg: 'modal-container-lg',
    xl: 'modal-container-xl',
    full: 'modal-container-full'
  };
  
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      {/* Backdrop */}
      <div 
        className="modal-backdrop"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`modal-container-wrapper ${sizes[size]} ${className}`} {...props}>
        {/* Header */}
        {title && (
          <div className="modal-header">
            <h3 className="modal-title">{title}</h3>
            <button
              onClick={onClose}
              className="modal-close-button"
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Content */}
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
};

const ModalHeader = ({ children, className = '', ...props }) => (
  <div className={`modal-header ${className}`} {...props}>
    {children}
  </div>
);

const ModalFooter = ({ children, className = '', ...props }) => (
  <div className={`modal-footer ${className}`} {...props}>
    {children}
  </div>
);

Modal.Header = ModalHeader;
Modal.Footer = ModalFooter;

export default Modal;
