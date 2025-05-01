
export type SubscriptionTier = 'free' | 'pro' | 'ultra';

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string;
  price: number;
  features: string[];
  isPopular?: boolean;
}

// Define available subscription plans
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free-plan',
    tier: 'free',
    name: 'Free',
    description: 'Basic bookkeeping for individuals',
    price: 0,
    features: [
      'Up to 100 transactions/month',
      'Basic categorization',
      'Standard reports',
      'CSV import/export',
      '1 bank connection'
    ]
  },
  {
    id: 'pro-plan',
    tier: 'pro',
    name: 'Pro',
    description: 'Advanced features for professionals',
    price: 19.99,
    isPopular: true,
    features: [
      'Unlimited transactions',
      'AI-powered categorization',
      'Advanced reporting',
      'CSV & API integration',
      'Up to 5 bank connections',
      'Email support'
    ]
  },
  {
    id: 'ultra-plan',
    tier: 'ultra',
    name: 'Ultra',
    description: 'Enterprise-grade solution',
    price: 49.99,
    features: [
      'Everything in Pro',
      'Custom categories',
      'Team access',
      'Unlimited bank connections',
      'Priority support',
      'Advanced analytics',
      'White-labeled reports'
    ]
  }
];
