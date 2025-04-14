
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';
import { SubscriptionTier } from '@/types/subscription';
import { UserProfileRow } from '@/types/supabase';

interface UserProfile {
  id: string;
  email: string;
  subscription_tier: SubscriptionTier;
  is_admin: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    // Set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // If user logs in, fetch their profile
        if (session?.user) {
          fetchUserProfile(session.user.id);
        } else {
          setUserProfile(null);
          setIsAdmin(false);
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
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        
        // If the user profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          await createUserProfile(userId);
          return;
        }
        return;
      }

      // For now, hardcode the admin check to your specific email
      // In a real app, this would be a role in the database
      const adminStatus = user?.email === 'terramultaacc@gmail.com';
      setIsAdmin(adminStatus);
      
      // Set default subscription tier if not set
      const profile = {
        ...data,
        subscription_tier: data.subscription_tier || 'free',
        is_admin: adminStatus
      };
      
      setUserProfile(profile as UserProfile);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  // Add a function to create a user profile if it doesn't exist
  const createUserProfile = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: user?.email,
          subscription_tier: 'free',
          is_admin: user?.email === 'terramultaacc@gmail.com'
        });

      if (error) {
        console.error('Error creating user profile:', error);
        return;
      }

      // After creating the profile, fetch it
      fetchUserProfile(userId);
    } catch (error) {
      console.error('Error in createUserProfile:', error);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
      setUserProfile(null);
      setIsAdmin(false);
    } catch (error) {
      console.error('Error signing out:', error);
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
      isAdmin
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
