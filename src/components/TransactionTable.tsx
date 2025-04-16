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
  Sparkles,
  Store,
  Building,
  Download,
  RefreshCw,
  Scale,
  Edit,
  CheckCircle2,
  AlertCircle,
  Plus
} from "lucide-react";
import { Transaction, Category, Vendor, VendorItem, TableColumn } from "@/types";
import { useBookkeeping } from "@/context/BookkeepingContext";
import { useSettings } from "@/context/SettingsContext";
import { cn } from '@/lib/utils';
import { toast } from '@/utils/toast';
import { formatCurrency, formatDate } from '@/utils/currencyUtils';
import ColumnSelector, { Column } from './ColumnSelector';
import ReconcileDialog from './ReconcileDialog';
import { exportToCSV, isBalanceReconciled } from '@/utils/csvParser';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import VendorEditor from './VendorEditor';

interface TransactionTableProps {
  filter?: 'all' | 'unverified' | 'profit_loss' | 'balance_sheet' | 'by_vendor' | 'review';
  vendorName?: string;
  transactions: Transaction[];
  onRefresh?: () => void;
  expectedEndBalance?: number;
}

const TransactionTable: React.FC<TransactionTableProps> = ({ 
  filter = 'all', 
  vendorName,
  transactions,
  onRefresh,
  expectedEndBalance
}) => {
  const { 
    categories, 
    verifyTransaction, 
    analyzeTransactionWithAI,
    aiAnalyzeLoading,
    getBankConnectionById,
    updateTransaction,
    vendors
  } = useBookkeeping();
  
  const {
    currency,
    tableColumns,
    toggleColumn
  } = useSettings();
  
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isReconcileDialogOpen, setIsReconcileDialogOpen] = useState(false);
  const [reconciliationBalance, setReconciliationBalance] = useState<number | undefined>(expectedEndBalance);
  const [isVendorEditorOpen, setIsVendorEditorOpen] = useState(false);

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'unverified') {
      return !transaction.isVerified;
    } else if (filter === 'profit_loss') {
      return transaction.statementType === 'profit_loss';
    } else if (filter === 'balance_sheet') {
      return transaction.statementType === 'balance_sheet';
    } else if (filter === 'by_vendor' && vendorName) {
      return transaction.vendor === vendorName;
    } else if (filter === 'review') {
      return transaction.confidenceScore !== undefined && transaction.confidenceScore < 0.5 && !transaction.isVerified;
    }
    return true;
  });

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

  const categoriesByType: Record<string, Category[]> = {
    income: categories.filter(c => c.type === 'income'),
    expense: categories.filter(c => c.type === 'expense'),
    asset: categories.filter(c => c.type === 'asset'),
    liability: categories.filter(c => c.type === 'liability'),
    equity: categories.filter(c => c.type === 'equity'),
  };

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

  const getBankName = (transaction: Transaction) => {
    if (!transaction.bankAccountId) return "Unknown";
    
    const connection = getBankConnectionById(transaction.bankAccountId);
    return connection?.display_name || connection?.bank_name || "Unknown";
  };

  const handleVendorChange = (transaction: Transaction, vendorName: string) => {
    if (vendorName === 'add-new') {
      setIsVendorEditorOpen(true);
      return;
    }
    
    const updatedTransaction = { ...transaction, vendor: vendorName };
    updateTransaction(updatedTransaction);
    
    const vendorInfo = vendors.find(v => v.name === vendorName);
    if (vendorInfo && vendorInfo.category && !transaction.isVerified) {
      verifyTransaction(
        transaction.id,
        vendorInfo.category,
        vendorInfo.type,
        vendorInfo.statementType
      );
    }
  };

  const handleAddVendor = async (newVendor: Vendor) => {
    if (vendors.some(v => v.name === newVendor.name)) {
      toast.error(`Vendor "${newVendor.name}" already exists`);
      return;
    }
    
    try {
      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newVendor),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add vendor');
      }
      
      toast.success(`Added new vendor: ${newVendor.name}`);
      setIsVendorEditorOpen(false);
      
      if (onRefresh) {
        onRefresh();
      }
      
    } catch (err) {
      console.error('Error adding vendor:', err);
      toast.error('Failed to add vendor. Please try again.');
    }
  };

  const handleReconcile = (endBalance: number) => {
    setReconciliationBalance(endBalance);
    toast.success('Account reconciliation status updated');
  };

  const handleExportCSV = () => {
    const csvData = exportToCSV(transactions); 
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
      toast.success('Refreshing transactions and reports');
    }
  };

  const isAccountReconciled = reconciliationBalance !== undefined && 
                              transactions.length > 0 && 
                              isBalanceReconciled(transactions, reconciliationBalance);

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

  const uniqueVendors = Array.from(new Set(transactions.map(t => t.vendor).filter(Boolean) as string[])).sort();

  const mapTableColumnsToColumnSelector = (): Column[] => {
    return tableColumns.map(col => ({
      id: col.id,
      label: col.label || col.name,
      visible: col.visible
    }));
  };

  const handleToggleColumn = (columnId: string) => {
    const column = tableColumns.find(col => col.id === columnId);
    if (column) {
      toggleColumn(columnId, !column.visible);
    }
  };

  return (
    <TooltipProvider>
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
                    : filter === 'review'
                      ? 'Transactions Requiring Review'
                      : 'All Transactions'}
            {isAccountReconciled && (
              <span className="ml-2 inline-flex items-center text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Reconciled
              </span>
            )}
          </h2>
          
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="hover-scale"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh transactions and reports</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsVendorEditorOpen(true)}
                  className="hover-scale"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Vendor
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add a new vendor</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="hover-scale"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export transactions to CSV</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReconcileDialogOpen(true)}
                  className="hover-scale"
                >
                  <Scale className="h-4 w-4 mr-1" />
                  Reconcile
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reconcile your account balance</p>
              </TooltipContent>
            </Tooltip>
            
            <ColumnSelector
              columns={mapTableColumnsToColumnSelector()}
              onToggleColumn={handleToggleColumn}
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
                
                {tableColumns.find(col => col.id === 'balance')?.visible && (
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isAccountReconciled && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      Running Balance
                    </div>
                  </TableHead>
                )}
                
                {tableColumns.find(col => col.id === 'confidence')?.visible !== false && (
                  <TableHead>Confidence</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tableColumns.filter(col => col.visible).length + 1} className="text-center py-6 text-muted-foreground">
                    No transactions to display
                  </TableCell>
                </TableRow>
              ) : (
                sortedTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className={cn(
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
                            onValueChange={(value) => handleVendorChange(transaction, value)}
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
                    
                    {tableColumns.find(col => col.id === 'category')?.visible && (
                      <TableCell>
                        {transaction.isVerified ? (
                          transaction.category
                        ) : (
                          <div className="flex flex-col gap-1">
                            <Select 
                              defaultValue={transaction.aiSuggestion || transaction.category} 
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
                                
                                <SelectItem value="add-new">
                                  <div className="flex items-center">
                                    <Edit className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                                    <span>Add new category...</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {transaction.confidenceScore !== undefined && renderConfidenceScore(transaction.confidenceScore)}
                            {!transaction.confidenceScore && transaction.aiSuggestion && (
                              <div className="flex items-center">
                                <Sparkles className="h-3 w-3 mr-1 text-amber-500" />
                                <span className="text-xs">AI suggested</span>
                              </div>
                            )}
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
                        {renderConfidenceScore(transaction.confidenceScore)}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        <ReconcileDialog
          isOpen={isReconcileDialogOpen}
          onClose={() => setIsReconcileDialogOpen(false)}
          transactions={transactions}
          onReconcile={handleReconcile}
        />
        
        <VendorEditor
          isOpen={isVendorEditorOpen}
          onClose={() => setIsVendorEditorOpen(false)}
          onSave={handleAddVendor}
        />
      </div>
    </TooltipProvider>
  );
};

export default TransactionTable;
