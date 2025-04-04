
import React from 'react';
import { BookkeepingProvider } from '@/context/BookkeepingContext';
import Dashboard from '@/components/Dashboard';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-finance-blue text-white shadow-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Ledger AI Categorizer</h1>
              <p className="text-blue-200">Automated Bookkeeping & Financial Reporting</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <BookkeepingProvider>
          <Dashboard />
        </BookkeepingProvider>
      </main>

      <footer className="bg-gray-100 border-t mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-gray-600">
          <p>© 2025 Ledger AI Categorizer - Automated financial categorization and reporting</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
