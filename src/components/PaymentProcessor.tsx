
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SubscriptionPlan } from '@/types/subscription';
import { toast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface PaymentProcessorProps {
  plan: SubscriptionPlan;
  onSuccess?: () => void;
  onCancel?: () => void;
  currentTier: string;
}

const PaymentProcessor: React.FC<PaymentProcessorProps> = ({ 
  plan, 
  onSuccess, 
  onCancel,
  currentTier
}) => {
  const navigate = useNavigate();
  const [processing, setProcessing] = React.useState(false);

  const handlePayment = async () => {
    // If it's the free plan or current plan, no payment processing needed
    if (plan.tier === 'free' || plan.tier === currentTier) {
      onSuccess?.();
      return;
    }

    setProcessing(true);
    try {
      // The return URL where the user will be redirected after payment
      const returnUrl = window.location.origin + '/subscription';

      // Call the Supabase Edge Function to create a payment session
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          tier: plan.tier,
          returnUrl
        }
      });

      if (error) {
        throw error;
      }

      if (data.url) {
        // Redirect to the Stripe checkout page
        window.location.href = data.url;
      } else {
        // Handle success for free tier or direct updates
        toast.success(`Successfully subscribed to ${plan.name} plan!`);
        setProcessing(false);
        onSuccess?.();
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment processing failed. Please try again.');
      setProcessing(false);
      onCancel?.();
    }
  };

  return (
    <Button
      className={`w-full rounded-xl hover-scale ${
        currentTier === plan.tier
          ? 'bg-gray-400 hover:bg-gray-500 cursor-not-allowed'
          : plan.tier === 'free'
            ? 'bg-secondary hover:bg-secondary/90'
            : plan.tier === 'pro'
              ? 'bg-primary hover:bg-primary/90'
              : 'bg-finance-green hover:bg-finance-green-light'
      }`}
      onClick={handlePayment}
      disabled={currentTier === plan.tier || processing}
    >
      {processing ? 'Processing...' : currentTier === plan.tier ? 'Current Plan' : plan.price === 0 ? 'Get Started' : 'Subscribe'}
    </Button>
  );
};

export default PaymentProcessor;
