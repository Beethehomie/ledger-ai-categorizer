
import React from 'react';
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, HelpCircle } from "lucide-react";
import { Transaction } from '@/types';

interface TransactionRowProps {
  transaction: Transaction;
  onClick?: () => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({ transaction, onClick }) => {
  // Format the transaction amount as currency
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(transaction.amount);

  // Determine the status icon and color
  const getStatusBadge = () => {
    if (transaction.isVerified) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    }
    
    if (transaction.vendor && transaction.category) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          AI Categorized
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
        <HelpCircle className="h-3 w-3 mr-1" />
        Uncategorized
      </Badge>
    );
  };

  return (
    <TableRow 
      className="cursor-pointer hover:bg-muted/50"
      onClick={onClick}
    >
      <TableCell>{transaction.date}</TableCell>
      <TableCell className="max-w-[200px] truncate">{transaction.description}</TableCell>
      <TableCell>{transaction.vendor || "—"}</TableCell>
      <TableCell>{transaction.category || "—"}</TableCell>
      <TableCell className="text-right">
        <span className={transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}>
          {formattedAmount}
        </span>
      </TableCell>
      <TableCell className="text-center">
        {getStatusBadge()}
      </TableCell>
    </TableRow>
  );
};
