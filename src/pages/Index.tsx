
import React from 'react';
import { BookkeepingProvider } from '@/context/BookkeepingContext';
import Dashboard from '@/components/Dashboard';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold animate-fade-in">Ledger AI Categorizer</h1>
              <p className="text-primary-foreground/80 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                Automated Bookkeeping & Financial Reporting
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <BookkeepingProvider>
          <Dashboard />
        </BookkeepingProvider>
      </main>

      <footer className="bg-muted border-t mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          <p>© 2025 Ledger AI Categorizer - Automated financial categorization and reporting</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
