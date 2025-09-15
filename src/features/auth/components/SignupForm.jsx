import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../core/context/AuthContext';
import Button from '../../../core/components/Button';
import InputField from '../../../core/components/InputField';
import Card from '../../../core/components/Card';
import '../components/AuthForm.css';

const SignupForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  
  const { signup, loading, error, clearError } = useAuth();
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
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const result = await signup(formData.name, formData.email, formData.password);
    
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
            Create your account
          </h2>
          <p className="auth-subtitle">
            Or{' '}
            <Link to="/login" className="auth-link">
              sign in to your existing account
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
              label="Full name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
              placeholder="Enter your full name"
            />
            
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
              placeholder="Create a password"
            />
            
            <InputField
              label="Confirm password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              required
              placeholder="Confirm your password"
            />
            
            <div className="auth-terms">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
              />
              <label htmlFor="terms">
                I agree to the{' '}
                <a href="#" className="auth-terms-link">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="auth-terms-link">
                  Privacy Policy
                </a>
              </label>
            </div>
            
            <Button
              type="submit"
              loading={loading}
              className="btn-full"
            >
              Create account
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default SignupForm;
