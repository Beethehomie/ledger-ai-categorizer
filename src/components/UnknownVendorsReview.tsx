
import React, { useState } from 'react';
import { Transaction } from '@/types';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Store, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TransactionTable from './TransactionTable';

interface UnknownVendorsReviewProps {
  transactions: Transaction[];
}

const UnknownVendorsReview: React.FC<UnknownVendorsReviewProps> = ({ transactions }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (transactions.length === 0) {
    return null;
  }
  
  return (
    <Card className="border-[hsl(var(--border))] hover:shadow-md transition-all">
      <CardHeader>
        <CardTitle className="text-[hsl(var(--finance-soft-yellow))] flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Transactions Without Vendors
          <Badge variant="outline" className="ml-2">{transactions.length}</Badge>
        </CardTitle>
        <CardDescription>
          These transactions need to be assigned a vendor for proper categorization
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isExpanded ? (
          <div className="animate-fade-in">
            <TransactionTable 
              filter="all" 
              transactions={transactions} 
            />
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={() => setIsExpanded(false)}
              >
                Hide Transactions
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4">
            <Store className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">
              {transactions.length} transactions need vendor assignment
            </p>
            <Button
              variant="outline"
              onClick={() => setIsExpanded(true)}
            >
              View Transactions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UnknownVendorsReview;
