
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNavigate } from 'react-router-dom';
import { Settings, User, Shield, Bell, Moon, Sun, Globe, CreditCard } from "lucide-react";
import { useAuth } from '@/hooks/auth';
import { useSettings } from '@/context/SettingsContext';
import { toast } from '@/utils/toast';
import { Currency } from '@/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from '@/integrations/supabase/client';
import { BusinessContextFormValues } from '@/components/business/BusinessContextQuestionnaire';
import BusinessInsight from '@/components/business/BusinessInsight';

const SettingsPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { currency, setCurrency, darkMode, toggleDarkMode } = useSettings();
  const [businessContext, setBusinessContext] = useState<BusinessContextFormValues | undefined>(undefined);
  const [businessInsight, setBusinessInsight] = useState<{
    summary: string;
    generated_at: string;
    context_snapshot?: BusinessContextFormValues;
  } | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Helper function to ensure currency is of correct type
  const handleSetCurrency = (value: string) => {
    // Validate that the currency is one of the allowed types
    const validCurrencies: Currency[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR'];
    if (validCurrencies.includes(value as Currency)) {
      setCurrency(value as Currency);
      toast.success(`Currency updated to ${value}`);
    } else {
      console.error(`Invalid currency: ${value}`);
      // Default to USD if invalid
      setCurrency('USD');
    }
  };

  // Fetch business context and insight
  useEffect(() => {
    const fetchBusinessData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('business_context, business_insight')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error('Error fetching business data:', error);
          setError(`Failed to load business information: ${error.message}`);
          return;
        }
        
        if (data) {
          // Only set these values if data exists and properties are present
          if ('business_context' in data && data.business_context) {
            setBusinessContext(data.business_context as BusinessContextFormValues);
          }
          
          if ('business_insight' in data && data.business_insight) {
            setBusinessInsight(data.business_insight as any);
          }
        }
      } catch (err) {
        console.error('Exception fetching business data:', err);
        setError('An unexpected error occurred when loading business information');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBusinessData();
  }, [user]);

  const handleContextUpdate = async () => {
    if (!user) return;
    
    setError(null);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('business_context, business_insight')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Error refreshing business data:', error);
        toast.error(`Failed to refresh data: ${error.message}`);
        return;
      }
      
      if (data) {
        // Only update these values if data exists and properties are present
        if ('business_context' in data && data.business_context) {
          setBusinessContext(data.business_context as BusinessContextFormValues);
        }
        
        if ('business_insight' in data && data.business_insight) {
          setBusinessInsight(data.business_insight as any);
        }
        
        toast.success('Business information updated');
      }
    } catch (err) {
      console.error('Exception refreshing business data:', err);
      toast.error('An unexpected error occurred');
    }
  };
  
  return (
    <TooltipProvider>
      <div className="container mx-auto py-8 px-4 animate-fade-in">
        <h1 className="text-3xl font-bold mb-8 flex items-center">
          <Settings className="h-6 w-6 mr-2" />
          Settings
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-6">
            <Card className="overflow-hidden border hover:shadow-md transition-all duration-300 rounded-2xl">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Account Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Email</p>
                    <p className="text-muted-foreground">{user?.email}</p>
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => navigate('/subscription')}
                    className="w-full hover-scale rounded-xl"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Subscription
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => toast.success('Password reset email sent')}
                    className="w-full hover-scale rounded-xl"
                  >
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {isAdmin && (
              <Card className="overflow-hidden border hover:shadow-md transition-all duration-300 rounded-2xl">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Admin Access
                  </CardTitle>
                  <CardDescription>
                    You have administrator privileges
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <Button
                    variant="default"
                    onClick={() => navigate('/admin')}
                    className="w-full hover-scale rounded-xl"
                  >
                    Admin Dashboard
                  </Button>
                </CardContent>
              </Card>
            )}

            <BusinessInsight 
              businessContext={businessContext}
              businessInsight={businessInsight}
              onContextUpdate={handleContextUpdate}
            />
          </div>
          
          <div className="md:col-span-2 space-y-6">
            <Card className="overflow-hidden border hover:shadow-md transition-all duration-300 rounded-2xl">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  App Preferences
                </CardTitle>
                <CardDescription>
                  Customize your bookkeeping experience
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Dark Mode</p>
                    <p className="text-sm text-muted-foreground">
                      Toggle between light and dark themes
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Sun className="h-4 w-4" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Switch 
                          checked={darkMode}
                          onCheckedChange={toggleDarkMode}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{darkMode ? 'Switch to light mode' : 'Switch to dark mode'}</p>
                      </TooltipContent>
                    </Tooltip>
                    <Moon className="h-4 w-4" />
                  </div>
                </div>
                
                <div>
                  <p className="font-medium mb-2">Currency</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'] as Currency[]).map((curr) => (
                      <Tooltip key={curr}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={currency === curr ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleSetCurrency(curr)}
                            className="rounded-xl hover-scale"
                          >
                            {curr}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Set currency to {curr}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden border hover:shadow-md transition-all duration-300 rounded-2xl">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  Notifications
                </CardTitle>
                <CardDescription>
                  Manage your notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[
                    { id: 'email', label: 'Email Notifications' },
                    { id: 'transaction', label: 'New Transaction Alerts' },
                    { id: 'report', label: 'Monthly Report Summaries' }
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <Label htmlFor={item.id}>{item.label}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Switch id={item.id} defaultChecked={item.id === 'email'} />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Toggle {item.label.toLowerCase()}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default SettingsPage;
