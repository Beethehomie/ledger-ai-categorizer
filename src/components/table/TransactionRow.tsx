
import React from 'react';
import { TableRow, TableCell } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/utils/currencyUtils";
import { Transaction, TableColumn, CurrencySettings } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

interface TransactionRowProps {
  transaction: Transaction;
  currency: CurrencySettings;
  tableColumns: TableColumn[];
  uniqueVendors: string[];
  onVendorChange: (transaction: Transaction, vendorName: string) => void;
  getBankName: (transaction: Transaction) => string;
  renderConfidenceScore: (score?: number) => React.ReactNode;
}

const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  currency,
  tableColumns,
  uniqueVendors,
  onVendorChange,
  getBankName,
  renderConfidenceScore,
}) => {
  return (
    <TableRow
      className={cn(
        "hover:bg-muted/30 transition-colors",
        transaction.isVerified ? "bg-green-50/30" : ""
      )}
    >
      {tableColumns.find(col => col.id === 'date')?.visible && (
        <TableCell className="font-medium">
          {formatDate(transaction.date, currency.dateFormat)}
        </TableCell>
      )}
      
      {tableColumns.find(col => col.id === 'description')?.visible && (
        <TableCell className="max-w-xs truncate">
          <span className={cn(transaction.aiSuggestion && "italic")}>
            {transaction.description}
          </span>
        </TableCell>
      )}
      
      {tableColumns.find(col => col.id === 'vendor')?.visible && (
        <TableCell>
          <Select
            value={transaction.vendor || ""}
            onValueChange={(value) => onVendorChange(transaction, value)}
          >
            <SelectTrigger className="h-8 w-40">
              <SelectValue placeholder="Select vendor" />
            </SelectTrigger>
            <SelectContent>
              {uniqueVendors.map((vendor) => (
                <SelectItem key={vendor} value={vendor}>
                  {vendor}
                </SelectItem>
              ))}
              <SelectItem value="add-new">+ Add New Vendor</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
      )}
      
      {tableColumns.find(col => col.id === 'amount')?.visible && (
        <TableCell className="text-right">
          <span className={cn(
            transaction.amount < 0 ? "text-red-600" : "text-green-600",
            "font-medium"
          )}>
            {formatCurrency(transaction.amount, currency.code)}
          </span>
        </TableCell>
      )}
      
      {tableColumns.find(col => col.id === 'category')?.visible && (
        <TableCell>
          {transaction.category ? (
            <span className={cn(
              "px-2 py-1 text-xs font-medium rounded-full",
              transaction.isVerified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            )}>
              {transaction.category}
            </span>
          ) : transaction.aiSuggestion ? (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 italic">
              {transaction.aiSuggestion}
            </span>
          ) : (
            <span className="text-muted-foreground">Uncategorized</span>
          )}
        </TableCell>
      )}
      
      {tableColumns.find(col => col.id === 'statementType')?.visible && (
        <TableCell>
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
            {transaction.statementType === 'profit_loss' 
              ? 'P&L' 
              : transaction.statementType === 'balance_sheet'
                ? 'Balance'
                : 'Unknown'
            }
          </span>
        </TableCell>
      )}
      
      {tableColumns.find(col => col.id === 'bankAccount')?.visible && (
        <TableCell className="text-sm text-muted-foreground">
          {getBankName(transaction)}
        </TableCell>
      )}
      
      {tableColumns.find(col => col.id === 'balance')?.visible && (
        <TableCell className="text-right font-medium">
          {transaction.balance !== undefined ? (
            formatCurrency(transaction.balance, currency.code)
          ) : (
            <span className="text-muted-foreground text-sm">Not available</span>
          )}
        </TableCell>
      )}
      
      {tableColumns.find(col => col.id === 'confidence')?.visible !== false && (
        <TableCell>
          {renderConfidenceScore(transaction.confidenceScore)}
        </TableCell>
      )}
    </TableRow>
  );
};

export default TransactionRow;
