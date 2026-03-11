import React from 'react';
import { Navigate } from 'react-router-dom';

interface Session {
  role: string;
  token?: string;
  user?: { id: string; name: string; email: string };
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  let session: Session | null = null;
  try {
    session = JSON.parse(localStorage.getItem('session') || 'null') as Session | null;
  } catch {
    // malformed localStorage entry
  }

  if (!session) {
    return <Navigate to='/login' replace />;
  }

  if (adminOnly && session.role !== 'admin') {
    return <Navigate to='/search' replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
