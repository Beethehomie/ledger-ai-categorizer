
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Mail, CreditCard, PieChart, Database, Cloud } from 'lucide-react';

const ProductionTodoList = () => {
  const todos = [
    {
      id: 1,
      title: 'Email Verification System',
      description: 'Connect to an email service provider',
      icon: Mail,
      steps: [
        'Sign up for Resend.com',
        'Create API key in Resend dashboard',
        'Validate email domain at https://resend.com/domains',
        'Add RESEND_API_KEY to Supabase secrets',
        'Update edge function for email verification'
      ]
    },
    {
      id: 2,
      title: 'Payment Processing',
      description: 'Implement Stripe payment system',
      icon: CreditCard,
      steps: [
        'Create Stripe account',
        'Get API keys from Stripe dashboard',
        'Add STRIPE_SECRET_KEY to Supabase secrets',
        'Implement payment webhook endpoint',
        'Test payment flow in sandbox mode'
      ]
    },
    {
      id: 3,
      title: 'Data Integration',
      description: 'Connect reports and graphs to actual data',
      icon: PieChart,
      steps: [
        'Update financial summary queries',
        'Connect transaction graphs to real data',
        'Implement proper data aggregation',
        'Add caching layer for performance',
        'Set up automated data refresh'
      ]
    },
    {
      id: 4,
      title: 'Database Optimization',
      description: 'Optimize database queries and indexes',
      icon: Database,
      steps: [
        'Add proper indexes to bank_transactions table',
        'Optimize vendor categorization queries',
        'Implement query caching',
        'Set up database monitoring',
        'Configure backup strategy'
      ]
    },
    {
      id: 5,
      title: 'Infrastructure Setup',
      description: 'Production infrastructure configuration',
      icon: Cloud,
      steps: [
        'Set up proper CORS configuration',
        'Configure rate limiting',
        'Set up monitoring and alerts',
        'Configure error tracking',
        'Implement proper logging'
      ]
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          <CardTitle>Production Readiness Checklist</CardTitle>
        </div>
        <CardDescription>
          Items that need to be completed before going to production
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {todos.map((todo) => (
            <div key={todo.id} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <todo.icon className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">{todo.title}</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-3">{todo.description}</p>
              <div className="space-y-2">
                {todo.steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductionTodoList;
