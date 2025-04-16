
import React, { useState, useEffect } from 'react';
import { useBookkeeping } from '@/context/BookkeepingContext';
import TransactionTable from './TransactionTable';
import { AlertTriangle, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import UnknownVendorsReview from './UnknownVendorsReview';
import { toast } from '@/utils/toast';

const TransactionReviewPage = () => {
  const { transactions, analyzeTransactionWithAI } = useBookkeeping();
  const [isLoading, setIsLoading] = useState(false);
  
  // Filter for low confidence transactions
  const lowConfidenceTransactions = transactions.filter(
    t => t.confidenceScore !== undefined && 
    t.confidenceScore < 0.5 && 
    !t.isVerified
  );
  
  // Filter for unknown vendor transactions
  const unknownVendorTransactions = transactions.filter(
    t => !t.vendor || t.vendor === 'Unknown'
  );
  
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await analyzeTransactionWithAI(transactions[0]); // Pass a transaction object, not empty
      toast.success('Refreshed transactions for review');
    } catch (error) {
      console.error('Error refreshing transactions:', error);
      toast.error('Failed to refresh transactions');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[hsl(var(--card))] rounded-lg shadow-sm border border-[hsl(var(--border))] p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center">
            <AlertTriangle className="h-6 w-6 text-amber-500 mr-2" />
            Transactions Requiring Review
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({lowConfidenceTransactions.length} transactions)
            </span>
          </h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isLoading}
            title="Refresh review list"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <TransactionTable 
          filter="review" 
          transactions={transactions} 
          onRefresh={handleRefresh}
        />
      </div>

      <UnknownVendorsReview transactions={unknownVendorTransactions} />
    </div>
  );
};

export default TransactionReviewPage;
