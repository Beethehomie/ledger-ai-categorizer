
import React from 'react';
import { TransactionUploader } from './TransactionUploader';
import { TransactionsList } from './TransactionsList';
import { FinancialSummary } from './FinancialSummary';

const Dashboard: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TransactionUploader />
          <TransactionsList />
        </div>
        
        <div className="lg:col-span-1">
          <FinancialSummary />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
