
import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { exportToCSV } from '@/utils/csvParser';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-semibold mb-4">Welcome to Finance Tracker</h1>
      <p className="text-gray-600 mb-4">
        Track your finances with ease. Get started by connecting your bank accounts and categorizing your transactions.
      </p>
      
      <div className="space-y-4">
        {session ? (
          <>
            <p className="text-lg">You are logged in. Go to your dashboard to manage your finances.</p>
            <Button 
              onClick={() => navigate('/dashboard')} 
              className="bg-finance-green hover:bg-finance-green-light hover-scale"
            >
              Go to Dashboard <ArrowRight className="ml-2" />
            </Button>
          </>
        ) : (
          <>
            <p className="text-lg">Create an account or log in to start tracking your finances.</p>
            <Button 
              onClick={() => navigate('/auth/sign-up')} 
              className="bg-finance-green hover:bg-finance-green-light hover-scale"
            >
              Sign Up <ArrowRight className="ml-2" />
            </Button>
            <Button 
              onClick={() => navigate('/auth/sign-in')} 
              variant="outline" 
              className="hover-scale"
            >
              Log In <ArrowRight className="ml-2" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
