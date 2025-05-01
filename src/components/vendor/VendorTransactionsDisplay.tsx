
import React from 'react';
import { Transaction } from '@/types';
import { Store } from "lucide-react";
import TransactionTable from '../table/TransactionTable';  // Updated import path
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

interface VendorTransactionsDisplayProps {
  selectedVendor: string | null;
  transactions: Transaction[];
}

const VendorTransactionsDisplay: React.FC<VendorTransactionsDisplayProps> = ({
  selectedVendor,
  transactions
}) => {
  if (!selectedVendor) {
    return (
      <div className="text-center py-8 text-muted-foreground animate-fade-in">
        <Store className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50 animate-bounce-subtle" />
        <p>Select a vendor to view their transactions</p>
      </div>
    );
  }
  
  return (
    <div className="animate-fade-in">
      <Card className="hover:shadow-md transition-all">
        <CardHeader>
          <CardTitle className="text-lg">Transactions for {selectedVendor}</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionTable filter="by_vendor" vendorName={selectedVendor} transactions={transactions} />
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorTransactionsDisplay;
