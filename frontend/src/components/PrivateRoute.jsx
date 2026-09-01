import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Route protection wrapper component
 */
export default function PrivateRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  const user = (userStr ? JSON.parse(userStr) : null) || {};

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If user's role is not allowed, redirect to home/dashboard
    return <Navigate to="/" replace />;
  }

  return children;
}
