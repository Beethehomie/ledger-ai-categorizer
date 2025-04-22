
import React, { useState } from 'react';
import { useBookkeeping } from '@/context/BookkeepingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TransactionTable from './TransactionTable';
import TransactionEditor from './TransactionEditor';

const TransactionReviewPage = () => {
  const { transactions } = useBookkeeping();
  const [isTransactionEditorOpen, setIsTransactionEditorOpen] = useState(false);
  
  // Filter out transactions that need review (low confidence score)
  const transactionsNeedingReview = transactions.filter(
    (t) => (t.confidenceScore !== undefined && t.confidenceScore < 0.5 && !t.isVerified)
  );
  
  // Filter out unverified transactions
  const unverifiedTransactions = transactions.filter(
    (t) => !t.isVerified
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Transactions Needing Review
            </CardTitle>
          </div>
          <Button 
            onClick={() => setIsTransactionEditorOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
        </CardHeader>
        <CardContent>
          {transactionsNeedingReview.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No transactions currently need review.
            </div>
          ) : (
            <TransactionTable 
              transactions={transactionsNeedingReview} 
              filter="needs_review" 
            />
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Unverified Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {unverifiedTransactions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No unverified transactions.
            </div>
          ) : (
            <TransactionTable 
              transactions={unverifiedTransactions} 
              filter="unverified" 
            />
          )}
        </CardContent>
      </Card>
      
      <TransactionEditor 
        isOpen={isTransactionEditorOpen}
        onClose={() => setIsTransactionEditorOpen(false)}
      />
    </div>
  );
};

export default TransactionReviewPage;
