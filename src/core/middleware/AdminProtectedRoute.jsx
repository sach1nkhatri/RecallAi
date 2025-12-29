import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getNodeApiBase } from '../utils/nodeApi';

const AdminProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyAdmin = async () => {
      const token = localStorage.getItem('adminToken');
      
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${getNodeApiBase()}/api/admin/verify`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('admin');
        }
      } catch (error) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('admin');
      } finally {
        setIsLoading(false);
      }
    };

    verifyAdmin();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

export default AdminProtectedRoute;

