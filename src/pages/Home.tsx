
import React from 'react';
import { HeroSection } from '@/components/ui/hero-section';
import { TransactionUploader } from '@/components/TransactionUploader';
import { TransactionsList } from '@/components/TransactionsList';
import { FinancialSummary } from '@/components/FinancialSummary';

const Home = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Transaction Management</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <TransactionUploader />
            <TransactionsList />
          </div>
          
          <div className="md:col-span-1">
            <FinancialSummary />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
