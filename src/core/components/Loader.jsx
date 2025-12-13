import React from 'react';
import '../css/Loader.css';

const Loader = ({ size = 'md', className = '', ...props }) => {
  const sizes = {
    sm: 'loader-spinner-sm',
    md: 'loader-spinner-md',
    lg: 'loader-spinner-lg',
    xl: 'loader-spinner-xl'
  };
  
  return (
    <div className={`loader ${className}`} {...props}>
      <svg 
        className={`loader-spinner ${sizes[size]}`} 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="loader-spinner-circle" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="loader-spinner-path" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

const PageLoader = ({ message = 'Loading...' }) => (
  <div className="loader-page">
    <div className="loader-page-content">
      <Loader size="xl" />
      <p className="loader-page-message">{message}</p>
    </div>
  </div>
);

const InlineLoader = ({ message }) => (
  <div className="loader-inline">
    <Loader size="sm" />
    {message && <span className="loader-inline-message">{message}</span>}
  </div>
);

Loader.Page = PageLoader;
Loader.Inline = InlineLoader;

export default Loader;
