import React from 'react';
import '../css/InputField.css';

const InputField = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  className = '',
  ...props
}) => {
  const inputClasses = `input-field-input ${error ? 'input-field-error' : ''} ${disabled ? 'input-field-disabled' : ''} ${className}`;
  
  return (
    <div className={`input-field ${error ? 'input-field-error' : ''} ${disabled ? 'input-field-disabled' : ''}`}>
      {label && (
        <label htmlFor={name} className="input-field-label">
          {label}
          {required && <span className="input-field-required">*</span>}
        </label>
      )}
      
      {type === 'file' ? (
        <div className="input-field-with-icon">
          <input
            type="file"
            id={name}
            name={name}
            onChange={onChange}
            disabled={disabled}
            className="input-field-file"
            {...props}
          />
          <div className="input-field-file-text">
            <div className="input-field-file-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p>Click to upload or drag and drop</p>
            <p>PDF, DOC, TXT files up to 10MB</p>
          </div>
        </div>
      ) : (
        <input
          type={type}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClasses}
          {...props}
        />
      )}
      
      {error && (
        <p className="input-field-error-message">{error}</p>
      )}
    </div>
  );
};

export default InputField;
