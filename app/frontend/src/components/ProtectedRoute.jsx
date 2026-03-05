import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Wraps a route and redirects to /login if no session exists in localStorage.
 * Optionally restrict to adminOnly routes (e.g. the inventory management pages).
 */
const ProtectedRoute = ({ children, adminOnly = false }) => {
  let session = null;
  try {
    session = JSON.parse(localStorage.getItem('session'));
  } catch {
    // malformed localStorage entry
  }

  if (!session) {
    return <Navigate to='/login' replace />;
  }

  if (adminOnly && session.role !== 'admin') {
    return <Navigate to='/search' replace />;
  }

  return children;
};

export default ProtectedRoute;
