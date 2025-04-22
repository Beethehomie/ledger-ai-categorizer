
import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Store } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate, formatCurrency } from '@/utils/currencyUtils';
import { Transaction } from '@/types';
import { cn } from '@/lib/utils';

interface TransactionRowProps {
  transaction: Transaction;
  currency: string;
  tableColumns: { id: string; visible: boolean }[];
  uniqueVendors: string[];
  onVendorChange: (transaction: Transaction, vendorName: string) => void;
  getBankName: (transaction: Transaction) => string;
  renderConfidenceScore?: (score?: number) => React.ReactNode;
}

const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  currency,
  tableColumns,
  uniqueVendors,
  onVendorChange,
  getBankName,
  renderConfidenceScore
}) => {
  return (
    <TableRow className={cn(
      transaction.isVerified ? "" : "bg-muted/30",
      transaction.type === 'income' || transaction.amount > 0 ? "border-l-2 border-l-finance-green" : "",
      transaction.type === 'expense' && transaction.amount < 0 ? "border-l-2 border-l-finance-red" : "",
      transaction.confidenceScore !== undefined && transaction.confidenceScore < 0.5 ? "border-l-2 border-l-amber-500" : "",
      "transition-all hover:bg-muted/30"
    )}>
      {tableColumns.find(col => col.id === 'date')?.visible && (
        <TableCell>{formatDate(transaction.date, currency)}</TableCell>
      )}
      
      {tableColumns.find(col => col.id === 'description')?.visible && (
        <TableCell>{transaction.description}</TableCell>
      )}
      
      {tableColumns.find(col => col.id === 'vendor')?.visible && (
        <TableCell className="max-w-[200px]">
          <div className="flex items-center gap-2">
            <Select
              defaultValue={transaction.vendor || "Unknown"}
              onValueChange={(value) => onVendorChange(transaction, value)}
            >
              <SelectTrigger className="h-8 w-full border-0 bg-transparent hover:bg-muted/50 focus:ring-0 pl-0 truncate">
                <div className="flex items-center">
                  <Store className="h-4 w-4 text-finance-gray shrink-0 mr-2" />
                  <span className="truncate">{transaction.vendor || "Unknown"}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {transaction.vendor && !uniqueVendors.includes(transaction.vendor) && (
                  <SelectItem value={transaction.vendor}>
                    {transaction.vendor}
                  </SelectItem>
                )}
                <SelectItem value="Unknown">
                  <div className="flex items-center">
                    <AlertCircle className="h-3.5 w-3.5 mr-1 text-amber-500" />
                    <span>Unknown</span>
                  </div>
                </SelectItem>
                {uniqueVendors
                  .filter(vendor => vendor !== "Unknown")
                  .sort()
                  .map(vendor => (
                    <SelectItem key={vendor} value={vendor}>
                      {vendor}
                    </SelectItem>
                ))}
                <SelectItem value="add-new">
                  <div className="flex items-center">
                    <Edit className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    <span>Add new vendor...</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TableCell>
      )}
      
      {tableColumns.find(col => col.id === 'amount')?.visible && (
        <TableCell 
          className={cn(
            "text-right font-medium",
            transaction.amount > 0 ? "text-finance-green" : "text-finance-red"
          )}
        >
          {formatCurrency(transaction.amount, currency)}
        </TableCell>
      )}
      
      {tableColumns.find(col => col.id === 'bankAccount')?.visible && (
        <TableCell>
          <div className="flex items-center gap-1">
            <Building className="h-4 w-4 text-finance-gray" />
            <span>{getBankName(transaction)}</span>
          </div>
        </TableCell>
      )}
      
      {tableColumns.find(col => col.id === 'balance')?.visible && (
        <TableCell className="text-right font-medium">
          {transaction.balance !== undefined ? 
            formatCurrency(transaction.balance, currency) : 
            '-'}
        </TableCell>
      )}
      
      {tableColumns.find(col => col.id === 'confidence')?.visible !== false && (
        <TableCell>
          {renderConfidenceScore && renderConfidenceScore(transaction.confidenceScore)}
        </TableCell>
      )}
    </TableRow>
  );
};

export default TransactionRow;
