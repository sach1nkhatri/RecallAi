import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../core/context/AuthContext';
import Button from '../../../core/components/Button';
import InputField from '../../../core/components/InputField';
import Card from '../../../core/components/Card';
import '../css/AuthForm.css';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  
  const { login, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  
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
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      navigate('/dashboard');
    }
  };
  
  return (
    <div className="auth-container">
      <div className="auth-form-wrapper">
        <div className="auth-header">
          <div className="auth-logo">
            <span>R</span>
          </div>
          <h2 className="auth-title">
            Sign in to your account
          </h2>
          <p className="auth-subtitle">
            Or{' '}
            <Link to="/signup" className="auth-link">
              create a new account
            </Link>
          </p>
        </div>
        
        <Card>
          <form className="auth-form" onSubmit={handleSubmit}>
            {error && (
              <div className="auth-error">
                <p className="auth-error-text">{error}</p>
              </div>
            )}
            
            <InputField
              label="Email address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
              placeholder="Enter your email"
            />
            
            <InputField
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              required
              placeholder="Enter your password"
            />
            
            <div className="auth-field-group">
              <div className="auth-remember">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                />
                <label htmlFor="remember-me">
                  Remember me
                </label>
              </div>
              
              <div>
                <Link to="/forgot-password" className="auth-forgot-link">
                  Forgot your password?
                </Link>
              </div>
            </div>
            
            <Button
              type="submit"
              loading={loading}
              className="btn-full"
            >
              Sign in
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LoginForm;
