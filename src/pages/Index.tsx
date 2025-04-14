
import React, { useState } from 'react';
import { BookkeepingProvider } from '@/context/BookkeepingContext';
import Dashboard from '@/components/Dashboard';
import { User, LogOut, Wallet, PieChart, FileText, Settings, ShieldAlert, Download, Upload, CreditCard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import BankConnections from '@/components/BankConnections';
import { useSettings } from '@/context/SettingsContext';
import CurrencySelector from '@/components/CurrencySelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TransactionTable from '@/components/TransactionTable';
import { useBookkeeping } from '@/context/BookkeepingContext';
import { Link } from 'react-router-dom';
import { exportToCSV } from '@/utils/csvParser';
import UploadDialog from '@/components/UploadDialog';

const Index = () => {
  const { user, signOut } = useAuth();
  const { currency, setCurrency } = useSettings();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  
  // Check if user is admin (in a real app, this would be fetched from the database)
  const isAdmin = user?.email === 'terramultaacc@gmail.com';
  
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
            
            <div className="flex items-center space-x-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Button 
                variant="secondary" 
                size="sm" 
                className="flex items-center gap-1.5"
                onClick={() => setIsUploadDialogOpen(true)}
              >
                <Upload className="h-4 w-4" />
                Upload CSV
              </Button>
              
              <CurrencySelector value={currency} onChange={setCurrency} />
              
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
          <AppContent 
            isUploadDialogOpen={isUploadDialogOpen} 
            setIsUploadDialogOpen={setIsUploadDialogOpen}
            isAdmin={isAdmin}
          />
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

interface AppContentProps {
  isUploadDialogOpen: boolean;
  setIsUploadDialogOpen: (open: boolean) => void;
  isAdmin: boolean;
}

const AppContent = ({ isUploadDialogOpen, setIsUploadDialogOpen, isAdmin }: AppContentProps) => {
  const { transactions, bankConnections } = useBookkeeping();
  
  return (
    <>
      <Tabs defaultValue="reports" className="w-full">
        <div className="mb-6">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="reports">
              <PieChart className="h-4 w-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <FileText className="h-4 w-4 mr-2" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="banking">
              <Wallet className="h-4 w-4 mr-2" />
              Banking
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="reports" className="mt-0">
          <Dashboard />
        </TabsContent>
        
        <TabsContent value="transactions" className="mt-0">
          <div className="bg-[hsl(var(--card))] rounded-lg shadow-sm border border-[hsl(var(--border))] p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Transaction Management</h2>
              <Button variant="outline" size="sm" onClick={() => {
                const csvData = exportToCSV(transactions); 
                const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                const date = new Date().toISOString().split('T')[0];
                link.setAttribute('href', url);
                link.setAttribute('download', `transactions_${date}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
            <TransactionTable filter="all" transactions={transactions} />
          </div>
        </TabsContent>
        
        <TabsContent value="banking" className="mt-0">
          <div className="grid grid-cols-1 gap-6">
            <BankConnections />
          </div>
        </TabsContent>
        
        <TabsContent value="settings" className="mt-0">
          <div className="bg-[hsl(var(--card))] rounded-lg shadow-sm border border-[hsl(var(--border))] p-6">
            <h2 className="text-2xl font-bold mb-6">Settings</h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium mb-3">Application Settings</h3>
                <p className="text-muted-foreground">Currency and regional preferences</p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-3">Subscription</h3>
                <div className="flex flex-col gap-4">
                  <p className="text-muted-foreground">Manage your subscription plan and payment information</p>
                  <Link to="/subscription">
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-1.5"
                    >
                      <CreditCard className="h-4 w-4" />
                      Manage Subscription
                    </Button>
                  </Link>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-3">Admin Functions</h3>
                <div className="flex flex-wrap gap-3">
                  {isAdmin && (
                    <Link to="/admin">
                      <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                        <ShieldAlert className="h-4 w-4" />
                        Admin Dashboard
                      </Button>
                    </Link>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsUploadDialogOpen(true)}
                    className="flex items-center gap-1.5"
                  >
                    <Upload className="h-4 w-4" />
                    Upload CSV
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <UploadDialog 
        isOpen={isUploadDialogOpen} 
        onClose={() => setIsUploadDialogOpen(false)} 
        bankConnections={bankConnections}
      />
    </>
  );
};

export default Index;
