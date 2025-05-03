
import React, { useState } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from '@/utils/formatters';
import { Transaction } from '@/types';
import { cn } from '@/lib/utils';

interface TransactionRowProps {
  transaction: Transaction;
  currency: string;
  tableColumns: { id: string; name: string; visible: boolean }[];
  uniqueVendors: string[];
  onVendorChange: (transaction: Transaction, vendorName: string) => void;
  getBankName?: (transaction: Transaction) => string;
  renderConfidenceScore?: (score: number) => React.ReactNode;
  isSelected?: boolean;
  onSelectChange?: (id: string, selected: boolean) => void;
  extraCells?: React.ReactNode[];
}

const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  currency,
  tableColumns,
  uniqueVendors,
  onVendorChange,
  getBankName = () => "Unknown",
  renderConfidenceScore,
  isSelected = false,
  onSelectChange,
  extraCells = []
}) => {
  const [vendorSelectOpen, setVendorSelectOpen] = useState(false);

  // Format amount with proper color and currency
  const getAmountDisplay = (amount: number) => {
    return (
      <span className={amount >= 0 ? 'text-green-600' : 'text-red-600'}>
        {formatCurrency(amount, currency)}
      </span>
    );
  };

  // Get formatted date display
  const getDateDisplay = (date: string) => {
    try {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) return date;
      
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(parsedDate);
    } catch (e) {
      return date;
    }
  };

  // Render cells based on visible columns
  const renderCellContent = (columnId: string) => {
    switch (columnId) {
      case 'date':
        return getDateDisplay(transaction.date);
      case 'description':
        return (
          <div className="max-w-[300px] truncate" title={transaction.description}>
            {transaction.description}
          </div>
        );
      case 'amount':
        return getAmountDisplay(transaction.amount);
      case 'balance':
        return transaction.balance !== undefined 
          ? formatCurrency(transaction.balance, currency) 
          : null;
      case 'category':
        return transaction.category || 'Uncategorized';
      case 'vendor':
        return (
          <Select
            value={transaction.vendor || ''}
            onValueChange={(value) => onVendorChange(transaction, value)}
            open={vendorSelectOpen}
            onOpenChange={setVendorSelectOpen}
          >
            <SelectTrigger className="h-8 truncate max-w-[200px]">
              <SelectValue placeholder="Select vendor">
                {transaction.vendor || 'Select vendor'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {uniqueVendors.map((vendor) => (
                <SelectItem key={vendor} value={vendor}>
                  {vendor}
                </SelectItem>
              ))}
              <SelectItem value="add-new" className="font-medium">
                + Add New Vendor
              </SelectItem>
            </SelectContent>
          </Select>
        );
      case 'bank':
        return getBankName(transaction);
      case 'type':
        return transaction.type || 'Unspecified';
      case 'statement_type':
        return transaction.statementType || 'Unspecified';
      case 'confidence':
        return transaction.confidenceScore !== undefined && renderConfidenceScore
          ? renderConfidenceScore(transaction.confidenceScore)
          : null;
      case 'status':
        return (
          <div className="flex items-center space-x-2">
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                transaction.isVerified ? 'bg-green-500' : 'bg-amber-500'
              )}
            />
            <span className="text-xs">
              {transaction.isVerified ? 'Verified' : 'Pending'}
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <TableRow className={cn(
      'transition-colors hover:bg-muted/50',
      isSelected && 'bg-muted/30'
    )}>
      <TableCell className="p-2">
        {onSelectChange && (
          <Checkbox 
            checked={isSelected}
            onCheckedChange={(checked) => onSelectChange(transaction.id, !!checked)}
          />
        )}
      </TableCell>
      
      {tableColumns
        .filter(column => column.visible)
        .map(column => (
          <TableCell key={column.id}>
            {renderCellContent(column.id)}
          </TableCell>
        ))
      }
      
      {extraCells.map((cell, index) => (
        React.cloneElement(cell as React.ReactElement, { key: `extra-${index}` })
      ))}
    </TableRow>
  );
};

export default TransactionRow;
