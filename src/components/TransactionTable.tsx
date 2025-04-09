
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
  Sparkles,
  Plus,
  Bank
} from "lucide-react";
import { Transaction, Category } from "@/types";
import { useBookkeeping } from "@/context/BookkeepingContext";
import { useSettings } from "@/context/SettingsContext";
import { cn } from '@/lib/utils';
import { toast } from '@/utils/toast';
import VendorEditor from './VendorEditor';
import ColumnSelector from './ColumnSelector';
import { formatCurrency, formatDate } from '@/utils/currencyUtils';

interface TransactionTableProps {
  filter?: 'all' | 'unverified' | 'profit_loss' | 'balance_sheet' | 'by_vendor';
  vendorName?: string;
  transactions: Transaction[];
}

const TransactionTable: React.FC<TransactionTableProps> = ({ 
  filter = 'all', 
  vendorName,
  transactions
}) => {
  const { 
    categories, 
    verifyTransaction, 
    analyzeTransactionWithAI,
    aiAnalyzeLoading,
    getBankConnectionById
  } = useBookkeeping();
  
  const {
    currency,
    tableColumns,
    toggleColumn
  } = useSettings();
  
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isVendorEditorOpen, setIsVendorEditorOpen] = useState(false);

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

  // Get bank name for display
  const getBankName = (transaction: Transaction) => {
    if (!transaction.bankAccountId) return "Unknown";
    
    const connection = getBankConnectionById(transaction.bankAccountId);
    return connection?.display_name || connection?.bank_name || "Unknown";
  };

  // Render confidence score indicator
  const renderConfidenceScore = (score?: number) => {
    if (score === undefined) return null;
    
    const scorePercent = Math.round(score * 100);
    let color = 'text-finance-red';
    
    if (scorePercent >= 90) {
      color = 'text-finance-green';
    } else if (scorePercent >= 70) {
      color = 'text-finance-yellow';
    } else if (scorePercent >= 50) {
      color = 'text-amber-500';
    }
    
    return (
      <div className="flex items-center gap-1">
        <div className={cn("text-xs font-medium", color)}>
          {scorePercent}%
        </div>
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full", color.replace('text', 'bg'))} 
            style={{ width: `${scorePercent}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <h2 className="text-lg font-semibold">
          {filter === 'unverified' 
            ? 'Transactions For Review' 
            : filter === 'profit_loss' 
              ? 'Profit & Loss Transactions' 
              : filter === 'balance_sheet' 
                ? 'Balance Sheet Transactions'
                : filter === 'by_vendor' && vendorName
                  ? `Transactions for ${vendorName}`
                  : 'All Transactions'}
        </h2>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsVendorEditorOpen(true)}
            className="hover-scale"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Vendor
          </Button>
          
          <ColumnSelector
            columns={tableColumns}
            onToggleColumn={toggleColumn}
          />
        </div>
      </div>
      
      <div className="w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {tableColumns.find(col => col.id === 'date')?.visible && (
                <TableHead className="w-[100px] cursor-pointer" onClick={() => handleSort('date')}>
                  Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
              )}
              
              {tableColumns.find(col => col.id === 'description')?.visible && (
                <TableHead className="cursor-pointer" onClick={() => handleSort('description')}>
                  Description {sortField === 'description' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
              )}
              
              {tableColumns.find(col => col.id === 'vendor')?.visible && (
                <TableHead className="cursor-pointer" onClick={() => handleSort('vendor')}>
                  Vendor {sortField === 'vendor' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
              )}
              
              {tableColumns.find(col => col.id === 'amount')?.visible && (
                <TableHead className="cursor-pointer text-right" onClick={() => handleSort('amount')}>
                  Amount {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
              )}
              
              {tableColumns.find(col => col.id === 'category')?.visible && (
                <TableHead>Category</TableHead>
              )}
              
              {tableColumns.find(col => col.id === 'statementType')?.visible && (
                <TableHead>Statement Type</TableHead>
              )}
              
              {tableColumns.find(col => col.id === 'bankAccount')?.visible && (
                <TableHead>Bank Account</TableHead>
              )}
              
              {tableColumns.find(col => col.id === 'status')?.visible && (
                <TableHead className="text-center">Status</TableHead>
              )}
              
              {tableColumns.find(col => col.id === 'actions')?.visible && (
                <TableHead className="text-center">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={tableColumns.filter(col => col.visible).length} className="text-center py-6 text-muted-foreground">
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
                  {tableColumns.find(col => col.id === 'date')?.visible && (
                    <TableCell>{formatDate(transaction.date, currency)}</TableCell>
                  )}
                  
                  {tableColumns.find(col => col.id === 'description')?.visible && (
                    <TableCell>{transaction.description}</TableCell>
                  )}
                  
                  {tableColumns.find(col => col.id === 'vendor')?.visible && (
                    <TableCell className="flex items-center gap-1">
                      <Store className="h-4 w-4 text-finance-gray" />
                      {transaction.vendor || "Unknown"}
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
                  
                  {tableColumns.find(col => col.id === 'category')?.visible && (
                    <TableCell>
                      {transaction.isVerified ? (
                        transaction.category
                      ) : (
                        <div className="flex flex-col gap-1">
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
                          {transaction.confidenceScore !== undefined && renderConfidenceScore(transaction.confidenceScore)}
                        </div>
                      )}
                    </TableCell>
                  )}
                  
                  {tableColumns.find(col => col.id === 'statementType')?.visible && (
                    <TableCell>
                      {transaction.statementType ? (
                        transaction.statementType === 'profit_loss' ? 'P&L' : 'Balance Sheet'
                      ) : (
                        <span className="text-muted-foreground">Uncategorized</span>
                      )}
                    </TableCell>
                  )}
                  
                  {tableColumns.find(col => col.id === 'bankAccount')?.visible && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Bank className="h-4 w-4 text-finance-gray" />
                        <span>{getBankName(transaction)}</span>
                      </div>
                    </TableCell>
                  )}
                  
                  {tableColumns.find(col => col.id === 'status')?.visible && (
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
                  )}
                  
                  {tableColumns.find(col => col.id === 'actions')?.visible && (
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
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <VendorEditor
        categories={categories}
        onSave={(vendor) => {
          toast.success(`Added new vendor: ${vendor.name}`);
          setIsVendorEditorOpen(false);
        }}
        isOpen={isVendorEditorOpen}
        onClose={() => setIsVendorEditorOpen(false)}
      />
    </div>
  );
};

export default TransactionTable;
