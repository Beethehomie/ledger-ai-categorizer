
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth';

interface RequireAuthProps {
  children: ReactNode;
}

export const RequireAuth = ({ children }: RequireAuthProps) => {
  const { session } = useAuth();
  
  // If not authenticated, redirect to login page
  if (!session) {
    return <Navigate to="/auth" replace />;
  }
  
  // If authenticated, render the protected component
  return <>{children}</>;
};
