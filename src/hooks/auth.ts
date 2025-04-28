
import { useAuth as useAuthContext } from '@/context/AuthContext';

// Re-export the auth hook from the context with improved error handling
export const useAuth = () => {
  try {
    return useAuthContext();
  } catch (error) {
    console.error('Error using auth hook:', error);
    throw new Error('Authentication context is not available. Make sure you are using the AuthProvider.');
  }
};
