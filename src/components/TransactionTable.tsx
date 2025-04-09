
import React, { useState, useEffect } from 'react';
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
  Store,
  Sparkles
} from "lucide-react";
import { Transaction, Category } from "@/types";
import { useBookkeeping } from "@/context/BookkeepingContext";
import { cn } from '@/lib/utils';
import { toast } from '@/utils/toast';

interface TransactionTableProps {
  filter?: 'all' | 'unverified' | 'profit_loss' | 'balance_sheet' | 'by_vendor';
  vendorName?: string;
}

const TransactionTable: React.FC<TransactionTableProps> = ({ filter = 'all', vendorName }) => {
  const { 
    transactions, 
    categories, 
    verifyTransaction, 
    analyzeTransactionWithAI,
    aiAnalyzeLoading
  } = useBookkeeping();
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filter transactions based on the filter prop
  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'unverified') {
      return !transaction.isVerified;
    } else if (filter === 'profit_loss') {
      return transaction.statementType === 'profit_loss';
    } else if (filter === 'balance_sheet') {
      return transaction.statementType === 'balance_sheet';
    } else if (filter === 'by_vendor' && vendorName) {
      return transaction.vendor === vendorName;
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
    } else if (sortField === 'vendor') {
      return sortDirection === 'asc'
        ? (a.vendor || '').localeCompare(b.vendor || '')
        : (b.vendor || '').localeCompare(a.vendor || '');
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

  // Handle AI analysis of a transaction
  const handleAIAnalyze = async (transaction: Transaction) => {
    setProcessingId(transaction.id);
    try {
      const result = await analyzeTransactionWithAI(transaction);
      
      if (result && result.category) {
        const updatedTransaction = {
          ...transaction,
          aiSuggestion: result.category
        };
        
        toast.success(
          `AI Suggestion: ${result.category} (Confidence: ${Math.round(result.confidence * 100)}%)`
        );
      } else {
        toast.error('Could not get AI suggestion for this transaction');
      }
    } catch (error) {
      console.error('Error in AI analysis:', error);
      toast.error('Failed to analyze transaction with AI');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="w-full overflow-auto animate-fade-in">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px] cursor-pointer" onClick={() => handleSort('date')}>
              Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort('description')}>
              Description {sortField === 'description' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort('vendor')}>
              Vendor {sortField === 'vendor' && (sortDirection === 'asc' ? '↑' : '↓')}
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
              <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                No transactions to display
              </TableCell>
            </TableRow>
          ) : (
            sortedTransactions.map((transaction) => (
              <TableRow key={transaction.id} className={cn(
                transaction.isVerified ? "" : "bg-muted/30",
                transaction.type === 'income' || transaction.amount > 0 ? "border-l-2 border-l-finance-green" : "",
                transaction.type === 'expense' && transaction.amount < 0 ? "border-l-2 border-l-finance-red" : "",
                "transition-all hover:bg-muted/30"
              )}>
                <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell className="flex items-center gap-1">
                  <Store className="h-4 w-4 text-finance-gray" />
                  {transaction.vendor || "Unknown"}
                </TableCell>
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
                      <CheckCircle className="h-5 w-5 text-finance-green animate-pulse" />
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
                      {!transaction.aiSuggestion && !aiAnalyzeLoading && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-finance-blue hover-scale"
                          onClick={() => handleAIAnalyze(transaction)}
                          disabled={processingId === transaction.id}
                        >
                          {processingId === transaction.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {transaction.aiSuggestion && (
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-finance-green hover-scale"
                          onClick={() => handleVerify(transaction, transaction.aiSuggestion!)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-finance-red hover-scale"
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
