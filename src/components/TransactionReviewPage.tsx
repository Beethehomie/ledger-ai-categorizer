
import React from 'react';
import { useBookkeeping } from '@/context/BookkeepingContext';
import TransactionTable from './TransactionTable';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from '@/utils/toast';
import UnknownVendorsReview from './UnknownVendorsReview';

const TransactionReviewPage: React.FC = () => {
  const { transactions } = useBookkeeping();

  // Filter transactions that need review (low confidence)
  const transactionsNeedingReview = transactions.filter(t => 
    t.confidenceScore !== undefined && 
    t.confidenceScore < 0.5 && 
    !t.isVerified
  );

  const handleRefresh = () => {
    toast.success('Refreshing transactions for review');
  };

  return (
    <div className="space-y-6">
      <div className="bg-[hsl(var(--card))] rounded-lg shadow-sm border border-[hsl(var(--border))] p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center">
            <AlertTriangle className="h-6 w-6 text-amber-500 mr-2" />
            Transactions Requiring Review
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({transactionsNeedingReview.length} transactions)
            </span>
          </h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            title="Refresh review list"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <TransactionTable 
          filter="review" 
          transactions={transactions} 
          onRefresh={handleRefresh}
        />
      </div>

      <UnknownVendorsReview />
    </div>
  );
};

export default TransactionReviewPage;
