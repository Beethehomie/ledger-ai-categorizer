
export type SubscriptionTier = 'free' | 'pro' | 'ultra';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  features: string[];
  price: number;
  isPopular?: boolean;
  tier: SubscriptionTier;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Basic plan for individual use',
    price: 0,
    tier: 'free',
    features: [
      'CSV Transaction uploads',
      'Basic transaction categories',
      'Single bank account',
      'Basic reports',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Advanced features for professionals',
    price: 9.99,
    tier: 'pro',
    isPopular: true,
    features: [
      'Everything in Free',
      'Multiple bank accounts',
      'Advanced categorization',
      'Export to accounting software',
      'Email support',
    ],
  },
  {
    id: 'ultra',
    name: 'Ultra',
    description: 'Enterprise-grade financial management',
    price: 19.99,
    tier: 'ultra',
    features: [
      'Everything in Pro',
      'Unlimited bank accounts',
      'Custom categories',
      'Priority support',
      'Advanced analytics',
      'Team access',
    ],
  },
];
