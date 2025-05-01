import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNavigate } from 'react-router-dom';
import { Settings, User, Shield, Bell, Moon, Sun, Globe } from "lucide-react";
import { useAuth } from '@/hooks/auth';
import { useSettings } from '@/context/SettingsContext';
import { toast } from '@/utils/toast';
import { Currency } from '@/types';

const SettingsPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode, currency, setCurrency } = useSettings();
  
  // Helper function to ensure currency is of correct type
  const handleSetCurrency = (value: string) => {
    // Validate that the currency is one of the allowed types
    const validCurrencies: Currency[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR'];
    if (validCurrencies.includes(value as Currency)) {
      setCurrency(value as Currency);
    } else {
      console.error(`Invalid currency: ${value}`);
      // Default to USD if invalid
      setCurrency('USD');
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 flex items-center">
        <Settings className="h-6 w-6 mr-2" />
        Settings
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Account Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Email</p>
                  <p className="text-muted-foreground">{user?.email}</p>
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => navigate('/subscription')}
                  className="w-full"
                >
                  Manage Subscription
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => toast.success('Password reset email sent')}
                  className="w-full"
                >
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Admin Access
                </CardTitle>
                <CardDescription>
                  You have administrator privileges
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="default"
                  onClick={() => navigate('/admin')}
                  className="w-full"
                >
                  Admin Dashboard
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                App Preferences
              </CardTitle>
              <CardDescription>
                Customize your bookkeeping experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Toggle between light and dark themes
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Sun className="h-4 w-4" />
                  <Switch 
                    checked={darkMode}
                    onCheckedChange={toggleDarkMode}
                  />
                  <Moon className="h-4 w-4" />
                </div>
              </div>
              
              <div>
                <p className="font-medium mb-2">Currency</p>
                <div className="grid grid-cols-3 gap-2">
                  {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'].map((curr) => (
                    <Button
                      key={curr}
                      variant={currency === curr ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSetCurrency(curr)}
                    >
                      {curr}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notifications
              </CardTitle>
              <CardDescription>
                Manage your notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { id: 'email', label: 'Email Notifications' },
                  { id: 'transaction', label: 'New Transaction Alerts' },
                  { id: 'report', label: 'Monthly Report Summaries' }
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <Label htmlFor={item.id}>{item.label}</Label>
                    <Switch id={item.id} defaultChecked={item.id === 'email'} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
