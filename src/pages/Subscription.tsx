
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowLeft, Shield } from 'lucide-react';
import { SUBSCRIPTION_PLANS, SubscriptionPlan, SubscriptionTier } from '@/types/subscription';
import { toast } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import PaymentProcessor from '@/components/PaymentProcessor';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

const Subscription = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // In a real app, this would be fetched from Supabase
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('free');
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState<{ [key: string]: string[] }>({});

  useEffect(() => {
    const fetchUserSubscription = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('user_profiles')
          .select('subscription_tier')
          .eq('id', user.id)
          .single();

        if (error) {
          throw error;
        }

        if (data && data.subscription_tier) {
          setCurrentTier(data.subscription_tier as SubscriptionTier);
        } else {
          setCurrentTier('free');
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
        toast.error('Failed to load subscription information');
      } finally {
        setLoading(false);
      }
    };

    fetchUserSubscription();
  }, [user]);

  const handleSubscriptionSuccess = async (plan: SubscriptionPlan) => {
    // In a real app, this would update the user's subscription in the database
    toast.success(`Successfully subscribed to ${plan.name} plan!`);
    setCurrentTier(plan.tier);
    
    // Redirect to home page after a short delay
    setTimeout(() => {
      navigate('/');
    }, 1500);
  };

  const goBackToDashboard = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <p>Loading subscription information...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Choose Your Plan</h1>
        <Button 
          variant="outline" 
          onClick={goBackToDashboard}
          className="flex items-center gap-2 rounded-xl hover-scale"
        >
          <ArrowLeft className="h-4 w-4" /> 
          Back to Dashboard
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isCurrentPlan = plan.tier === currentTier;
          
          return (
            <Card 
              key={plan.id} 
              className={`relative hover:shadow-lg transition-all rounded-2xl ${
                isCurrentPlan 
                  ? 'border-2 border-finance-green' 
                  : plan.isPopular 
                    ? 'border-2 border-primary' 
                    : ''
              }`}
            >
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-finance-green text-white text-sm px-4 py-1 rounded-full font-semibold">
                  Current Plan
                </div>
              )}
              
              {plan.isPopular && !isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground text-sm px-4 py-1 rounded-full font-semibold">
                  Most Popular
                </div>
              )}
              
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-t-2xl">
                <CardTitle className="text-2xl flex justify-between items-center">
                  {plan.name}
                  <Badge variant={plan.tier === 'free' ? 'secondary' : plan.tier === 'pro' ? 'default' : 'destructive'}>
                    {plan.tier}
                  </Badge>
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="text-3xl font-bold mt-2">
                  ${plan.price}
                  <span className="text-sm text-muted-foreground font-normal">/month</span>
                </div>
              </CardHeader>
              
              <CardContent className="p-6">
                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-finance-green flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter className="p-6 pt-0">
                <PaymentProcessor 
                  plan={plan} 
                  currentTier={currentTier}
                  onSuccess={() => handleSubscriptionSuccess(plan)}
                />
              </CardFooter>
            </Card>
          );
        })}
      </div>
      
      <div className="text-center text-muted-foreground">
        <p>All plans come with a 14-day money back guarantee</p>
        <p className="mt-2">Have questions? Contact our support team</p>
      </div>
    </div>
  );
};

export default Subscription;
