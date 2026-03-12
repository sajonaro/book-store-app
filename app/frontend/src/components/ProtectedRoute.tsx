import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const session = useSession();

  if (!session) {
    return <Navigate to='/login' replace />;
  }

  if (adminOnly && session.role !== 'admin') {
    return <Navigate to='/search' replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
