
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';
import { SubscriptionTier } from '@/types/subscription';
import { logError } from '@/utils/errorLogger';
import { BusinessContext } from '@/types/supabase';

interface UserProfile {
  id: string;
  email: string;
  subscription_tier: SubscriptionTier;
  is_admin: boolean;
  business_context?: BusinessContext;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  hasBusinessContext: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [hasBusinessContext, setHasBusinessContext] = useState<boolean>(false);

  useEffect(() => {
    // Set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // If user logs in, fetch their profile
        if (session?.user) {
          // Use setTimeout to avoid potential auth deadlocks
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setUserProfile(null);
          setIsAdmin(false);
          setHasBusinessContext(false);
        }
      }
    );

    // Check for initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // If user is logged in, fetch their profile
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      
      setLoading(false);
    }).catch(error => {
      logError('AuthContext-getSession', error);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        logError('AuthContext-fetchUserProfile', error);
        
        // If the user profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          await createUserProfile(userId);
          return;
        }
        return;
      }

      if (!data) {
        // Profile not found, create it
        await createUserProfile(userId);
        return;
      }

      // For now, hardcode the admin check to your specific email
      // In a real app, this would be a role in the database
      const adminStatus = user?.email === 'terramultaacc@gmail.com';
      setIsAdmin(adminStatus || !!data.is_admin);
      
      // Check if the user has completed the business context questionnaire
      setHasBusinessContext(!!data.business_context && Object.keys(data.business_context).length > 0);
      
      // Create the UserProfile object with proper type handling
      const profile: UserProfile = {
        id: data.id,
        email: data.email || user?.email || '',
        subscription_tier: (data.subscription_tier as SubscriptionTier) || 'free',
        is_admin: data.is_admin || adminStatus,
        business_context: data.business_context
      };
      
      setUserProfile(profile);
    } catch (error) {
      logError('AuthContext-fetchUserProfile', error);
    }
  };

  // Add a function to create a user profile if it doesn't exist
  const createUserProfile = async (userId: string) => {
    try {
      // Only set admin to true for specific email
      const isUserAdmin = user?.email === 'terramultaacc@gmail.com';
      
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: user?.email,
          subscription_tier: 'free', // Always default to free
          is_admin: isUserAdmin,
          business_context: {}
        });

      if (error) {
        logError('AuthContext-createUserProfile', error);
        return;
      }

      // After creating the profile, fetch it
      setTimeout(() => {
        fetchUserProfile(userId);
      }, 100);
    } catch (error) {
      logError('AuthContext-createUserProfile', error);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
      setUserProfile(null);
      setIsAdmin(false);
      setHasBusinessContext(false);
    } catch (error) {
      logError('AuthContext-signOut', error);
      toast.error('Error signing out');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      userProfile, 
      loading, 
      signOut,
      isAdmin,
      hasBusinessContext
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
