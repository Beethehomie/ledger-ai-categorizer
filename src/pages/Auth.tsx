import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';
import { Lock, User, Mail, Eye, EyeOff, Fingerprint } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { TwoFactorAuth } from '@/components/TwoFactorAuth';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [tempSession, setTempSession] = useState(null);
  const [supportsBiometric, setSupportsBiometric] = useState(false);
  
  const navigate = useNavigate();

  // Check if the browser supports biometric authentication
  useEffect(() => {
    const checkBiometricSupport = async () => {
      try {
        // Check if the PublicKeyCredential API is available (WebAuthn)
        if (window.PublicKeyCredential && 
            PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setSupportsBiometric(available);
        }
      } catch (error) {
        console.error('Error checking biometric support:', error);
        setSupportsBiometric(false);
      }
    };
    
    checkBiometricSupport();
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      
      if (error) throw error;
      
      toast.success('Account created! Please check your email for verification.');
      // Navigate to the main page, the app will handle redirecting based on auth state
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
      // First, try to sign in normally
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password
      });
      
      if (error) throw error;
      
      // Check if we need 2FA
      // For now, we'll simulate 2FA for all users except remembered ones
      const shouldRequire2FA = !checkIfRecentLogin();
      
      if (shouldRequire2FA) {
        setTempSession(data.session);
        // Send 2FA email code (in a real app, this would be an API call)
        await sendTwoFactorCode(email);
        setShowTwoFactor(true);
      } else {
        // No 2FA needed, proceed with login
        toast.success('Signed in successfully');
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error signing in');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      setLoading(true);
      
      // This is a simplified example - in a real app you would:
      // 1. Call your backend to get a challenge
      // 2. Use WebAuthn API to get credentials
      // 3. Verify the credentials on the server
      
      toast.info('Biometric authentication would happen here');
      // Simulate successful authentication after delay
      setTimeout(() => {
        toast.success('Biometric authentication successful');
        navigate('/');
      }, 1500);
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      toast.error('Biometric authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Check if the user has logged in recently (within 30 days)
  const checkIfRecentLogin = () => {
    try {
      const lastLogin = localStorage.getItem('lastLoginTime');
      if (!lastLogin) return false;
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      return new Date(lastLogin) > thirtyDaysAgo && rememberMe;
    } catch (error) {
      console.error('Error checking last login:', error);
      return false;
    }
  };

  // Send 2FA code via email (simulated)
  const sendTwoFactorCode = async (email: string) => {
    try {
      // In a real app, this would be an API call to your server
      // which would generate a code and send an email
      // For now we'll just simulate success
      toast.success('Verification code sent to your email');
      return true;
    } catch (error) {
      console.error('Error sending 2FA code:', error);
      toast.error('Failed to send verification code');
      return false;
    }
  };

  const verifyTwoFactorCode = async () => {
    setLoading(true);
    try {
      // In a real app, this would verify the code with your backend
      // For now, we'll just accept any 6-digit code
      if (twoFactorCode.length === 6 && /^\d+$/.test(twoFactorCode)) {
        // If code is valid
        if (rememberMe) {
          // Store the last login time for the "remember me" feature
          localStorage.setItem('lastLoginTime', new Date().toISOString());
        }
        
        toast.success('Signed in successfully');
        navigate('/');
      } else {
        toast.error('Invalid verification code');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error verifying code');
    } finally {
      setLoading(false);
    }
  };

  if (showTwoFactor) {
    return (
      <TwoFactorAuth
        email={email}
        onVerify={verifyTwoFactorCode}
        onCancel={() => setShowTwoFactor(false)}
        onCodeChange={setTwoFactorCode}
        code={twoFactorCode}
        loading={loading}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold text-primary">Ledger AI</CardTitle>
          <CardDescription>Enter your email to sign in to your account</CardDescription>
        </CardHeader>
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <form onSubmit={handleSignIn}>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    <Input 
                      id="email" 
                      placeholder="m@example.com" 
                      className="pl-10" 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      className="pl-10 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button 
                      type="button"
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="remember-me" 
                    checked={rememberMe} 
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                  />
                  <Label htmlFor="remember-me" className="text-sm cursor-pointer">
                    Remember me for 30 days
                  </Label>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-3">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
                
                {supportsBiometric && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full flex items-center justify-center gap-2" 
                    onClick={handleBiometricLogin}
                    disabled={loading}
                  >
                    <Fingerprint className="h-5 w-5" />
                    Sign in with Biometrics
                  </Button>
                )}
              </CardFooter>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={handleSignUp}>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    <Input 
                      id="signup-email" 
                      placeholder="m@example.com" 
                      className="pl-10" 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    <Input 
                      id="signup-password" 
                      type={showPassword ? "text" : "password"} 
                      className="pl-10 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      required
                    />
                    <button 
                      type="button"
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="signup-remember-me" 
                    checked={rememberMe} 
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                  />
                  <Label htmlFor="signup-remember-me" className="text-sm cursor-pointer">
                    Remember me for 30 days
                  </Label>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Auth;
