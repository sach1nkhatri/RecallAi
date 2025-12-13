import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from './Button';
import '../css/Navbar.css';

const Navbar = ({ user, onLogout, variant = 'default' }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();
  
  const handleLogout = () => {
    onLogout();
    navigate('/');
    setIsProfileOpen(false);
  };
  
  if (variant === 'dashboard') {
    return (
      <nav className="navbar navbar-dashboard">
        <div className="navbar-content">
          <div className="navbar-brand">
            <h1 className="navbar-title">Recall AI</h1>
          </div>
          
          <div className="navbar-actions">
            {/* Notifications */}
            <button className="navbar-notification-button">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.5 19.5L9 15H4l5 5-4.5-4.5z" />
              </svg>
            </button>
            
            {/* Profile Dropdown */}
            <div className="navbar-profile">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="navbar-profile-button"
              >
                <div className="navbar-profile-avatar">
                  <span>
                    {user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <span className="navbar-profile-name">{user?.name || 'User'}</span>
                <svg className="navbar-profile-chevron" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isProfileOpen && (
                <div className="navbar-profile-dropdown">
                  <Link
                    to="/profile"
                    className="navbar-profile-dropdown-item"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    Profile Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="navbar-profile-dropdown-item"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    );
  }
  
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-content">
          {/* Logo */}
          <div className="navbar-brand">
            <Link to="/" className="navbar-logo">
              <div className="navbar-logo-icon">
                <span>R</span>
              </div>
              <span className="navbar-logo-text">Recall AI</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="navbar-nav">
            <Link to="/features" className="navbar-link">
              Features
            </Link>
            <Link to="/pricing" className="navbar-link">
              Pricing
            </Link>
            <Link to="/about" className="navbar-link">
              About
            </Link>
          </div>
          
          {/* Auth Buttons */}
          <div className="navbar-actions">
            {user ? (
              <div className="navbar-actions">
                <Link to="/dashboard">
                  <Button variant="outline">Dashboard</Button>
                </Link>
                <Button onClick={onLogout} variant="ghost">
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="navbar-actions">
                <Link to="/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/signup">
                  <Button>Get Started</Button>
                </Link>
              </div>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="navbar-mobile-button">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="navbar-mobile-button"
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className={`navbar-mobile-menu ${isMenuOpen ? 'open' : ''}`}>
            <div className="navbar-mobile-nav">
              <Link to="/features" className="navbar-link">
                Features
              </Link>
              <Link to="/pricing" className="navbar-link">
                Pricing
              </Link>
              <Link to="/about" className="navbar-link">
                About
              </Link>
              <div className="navbar-mobile-actions">
                {user ? (
                  <div className="navbar-mobile-actions">
                    <Link to="/dashboard">
                      <Button variant="outline" className="btn-full">Dashboard</Button>
                    </Link>
                    <Button onClick={onLogout} variant="ghost" className="btn-full">
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="navbar-mobile-actions">
                    <Link to="/login">
                      <Button variant="ghost" className="btn-full">Sign In</Button>
                    </Link>
                    <Link to="/signup">
                      <Button className="btn-full">Get Started</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
