
import React from 'react';
import { BookkeepingProvider } from '@/context/BookkeepingContext';
import Dashboard from '@/components/Dashboard';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import BankConnections from '@/components/BankConnections';

const Index = () => {
  const { user, signOut } = useAuth();
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
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
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-all cursor-pointer">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-medium">{user?.email}</div>
                  <Button 
                    variant="link" 
                    className="text-xs text-primary-foreground/70 p-0 h-auto hover:text-white"
                    onClick={signOut}
                  >
                    <LogOut className="h-3 w-3 mr-1" /> Sign out
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-grow">
        <BookkeepingProvider>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-2">
              <Dashboard />
            </div>
            <div className="md:col-span-1">
              <BankConnections />
            </div>
          </div>
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
