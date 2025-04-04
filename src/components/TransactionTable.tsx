
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  AlertTriangle,
  Check,
  Clock,
  X,
} from "lucide-react";
import { Transaction, Category } from "@/types";
import { useBookkeeping } from "@/context/BookkeepingContext";
import { cn } from '@/lib/utils';

interface TransactionTableProps {
  filter?: 'all' | 'unverified' | 'profit_loss' | 'balance_sheet';
}

const TransactionTable: React.FC<TransactionTableProps> = ({ filter = 'all' }) => {
  const { transactions, categories, verifyTransaction } = useBookkeeping();
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter transactions based on the filter prop
  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'unverified') {
      return !transaction.isVerified;
    } else if (filter === 'profit_loss') {
      return transaction.statementType === 'profit_loss';
    } else if (filter === 'balance_sheet') {
      return transaction.statementType === 'balance_sheet';
    }
    return true;
  });

  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortField === 'date') {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    } else if (sortField === 'amount') {
      return sortDirection === 'asc' ? a.amount - b.amount : b.amount - a.amount;
    } else if (sortField === 'description') {
      return sortDirection === 'asc'
        ? a.description.localeCompare(b.description)
        : b.description.localeCompare(a.description);
    }
    return 0;
  });

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Group categories by type
  const categoriesByType: Record<string, Category[]> = {
    income: categories.filter(c => c.type === 'income'),
    expense: categories.filter(c => c.type === 'expense'),
    asset: categories.filter(c => c.type === 'asset'),
    liability: categories.filter(c => c.type === 'liability'),
    equity: categories.filter(c => c.type === 'equity'),
  };

  // Handle verification of a transaction
  const handleVerify = (transaction: Transaction, categoryName: string) => {
    const selectedCategory = categories.find(c => c.name === categoryName);
    if (selectedCategory) {
      verifyTransaction(
        transaction.id,
        categoryName,
        selectedCategory.type,
        selectedCategory.statementType
      );
    }
  };

  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px] cursor-pointer" onClick={() => handleSort('date')}>
              Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort('description')}>
              Description {sortField === 'description' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead className="cursor-pointer text-right" onClick={() => handleSort('amount')}>
              Amount {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Statement Type</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTransactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                No transactions to display
              </TableCell>
            </TableRow>
          ) : (
            sortedTransactions.map((transaction) => (
              <TableRow key={transaction.id} className={cn(
                transaction.isVerified ? "" : "bg-muted/30",
                transaction.type === 'income' || transaction.amount > 0 ? "border-l-2 border-l-finance-green" : "",
                transaction.type === 'expense' && transaction.amount < 0 ? "border-l-2 border-l-finance-red" : ""
              )}>
                <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell 
                  className={cn(
                    "text-right font-medium",
                    transaction.amount > 0 ? "text-finance-green" : "text-finance-red"
                  )}
                >
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(transaction.amount)}
                </TableCell>
                <TableCell>
                  {transaction.isVerified ? (
                    transaction.category
                  ) : (
                    <Select 
                      defaultValue={transaction.aiSuggestion} 
                      onValueChange={(val) => handleVerify(transaction, val)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Replace empty values with unique non-empty identifiers */}
                        <SelectItem value="select-placeholder" disabled>Select a category</SelectItem>
                        
                        <SelectItem value="header-income" disabled className="font-bold text-finance-blue">Income</SelectItem>
                        {categoriesByType.income.map(category => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                        
                        <SelectItem value="header-expense" disabled className="font-bold text-finance-blue mt-2">Expenses</SelectItem>
                        {categoriesByType.expense.map(category => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                        
                        <SelectItem value="header-asset" disabled className="font-bold text-finance-blue mt-2">Assets</SelectItem>
                        {categoriesByType.asset.map(category => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                        
                        <SelectItem value="header-liability" disabled className="font-bold text-finance-blue mt-2">Liabilities</SelectItem>
                        {categoriesByType.liability.map(category => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                        
                        <SelectItem value="header-equity" disabled className="font-bold text-finance-blue mt-2">Equity</SelectItem>
                        {categoriesByType.equity.map(category => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell>
                  {transaction.statementType ? (
                    transaction.statementType === 'profit_loss' ? 'P&L' : 'Balance Sheet'
                  ) : (
                    <span className="text-muted-foreground">Uncategorized</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {transaction.isVerified ? (
                    <div className="flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-finance-green" />
                    </div>
                  ) : transaction.aiSuggestion ? (
                    <div className="flex items-center justify-center text-finance-yellow">
                      <AlertTriangle className="h-5 w-5 mr-1" />
                      <span className="text-xs">AI Suggested</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center text-muted-foreground">
                      <Clock className="h-5 w-5" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {!transaction.isVerified && (
                    <div className="flex space-x-1 justify-center">
                      {transaction.aiSuggestion && (
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-finance-green"
                          onClick={() => handleVerify(transaction, transaction.aiSuggestion!)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-finance-red"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default TransactionTable;
