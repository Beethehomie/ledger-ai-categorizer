
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

interface AuthFormProps {
  email: string;
  password: string;
  confirmPassword?: string;
  showPassword: boolean;
  loading: boolean;
  isSignUp?: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onConfirmPasswordChange?: (password: string) => void;
  onShowPasswordToggle: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({
  email,
  password,
  confirmPassword,
  showPassword,
  loading,
  isSignUp,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onShowPasswordToggle,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
            onChange={(e) => onEmailChange(e.target.value)}
            required
            autoComplete="email"
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
            onChange={(e) => onPasswordChange(e.target.value)}
            required
            minLength={6}
            autoComplete={isSignUp ? "new-password" : "current-password"}
          />
          <button 
            type="button"
            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
            onClick={onShowPasswordToggle}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {isSignUp && onConfirmPasswordChange && (
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input 
              id="confirm-password" 
              type={showPassword ? "text" : "password"} 
              className="pl-10 pr-10"
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
        </div>
      )}

      <Button 
        type="submit" 
        className="w-full" 
        disabled={loading}
      >
        {loading ? (isSignUp ? 'Creating Account...' : 'Signing in...') : (isSignUp ? 'Create Account' : 'Sign In')}
      </Button>
    </form>
  );
};
