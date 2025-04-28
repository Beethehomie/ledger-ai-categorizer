
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';
import { AuthForm } from '@/components/auth/AuthForm';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            subscription_tier: 'free'  // Default to free tier
          },
          emailRedirectTo: window.location.origin
        }
      });
      
      if (error) throw error;
      
      toast.success('Account created! Please check your email for verification.');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Error creating account');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password
      });
      
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          toast.error('Please verify your email before logging in');
        } else {
          throw error;
        }
      } else {
        toast.success('Signed in successfully');
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error signing in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold text-primary">Ledger AI</CardTitle>
          <CardDescription>Enter your email to sign in or create an account</CardDescription>
        </CardHeader>
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <CardContent>
              <AuthForm
                email={email}
                password={password}
                showPassword={showPassword}
                loading={loading}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                onShowPasswordToggle={() => setShowPassword(!showPassword)}
                onSubmit={handleSignIn}
              />
            </CardContent>
          </TabsContent>

          <TabsContent value="signup">
            <CardContent>
              <AuthForm
                email={email}
                password={password}
                confirmPassword={confirmPassword}
                showPassword={showPassword}
                loading={loading}
                isSignUp={true}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                onConfirmPasswordChange={setConfirmPassword}
                onShowPasswordToggle={() => setShowPassword(!showPassword)}
                onSubmit={handleSignUp}
              />
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Auth;
