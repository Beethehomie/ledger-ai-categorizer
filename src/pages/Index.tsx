
import React from 'react';
import { BookkeepingProvider } from '@/context/BookkeepingContext';
import Dashboard from '@/components/Dashboard';
import { User } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[hsl(var(--primary))] text-white shadow-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold animate-fade-in">Ledger AI Categorizer</h1>
              <p className="text-primary-foreground/80 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                Automated Bookkeeping & Financial Reporting
              </p>
            </div>
            
            <div className="flex items-center space-x-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-all cursor-pointer">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-medium">Financial Goals</div>
                <div className="text-xs text-primary-foreground/70">45% to $100k</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <BookkeepingProvider>
          <Dashboard />
        </BookkeepingProvider>
      </main>

      <footer className="bg-[hsl(var(--muted))] border-t mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
          <p>© 2025 Ledger AI Categorizer - Automated financial categorization and reporting</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
