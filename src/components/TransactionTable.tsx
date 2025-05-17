
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2
} from "lucide-react";
import { Transaction } from "@/types";
import { useBookkeeping } from "@/context/BookkeepingContext";
import { useSettings } from "@/context/SettingsContext";
import { toast } from '@/utils/toast';
import { exportToCSV, isBalanceReconciled } from '@/utils/csvParser';
import { TooltipProvider } from "@/components/ui/tooltip";
import ReconcileDialog from './ReconcileDialog';
import VendorEditor from './VendorEditor';
import ColumnSelector, { Column } from './ColumnSelector';
import ConfidenceScore from './table/ConfidenceScore';

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
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  
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

  const uniqueVendors = Array.from(new Set(transactions.map(t => t.vendor).filter(Boolean) as string[])).sort();

  const mapTableColumnsToColumnSelector = (): Column[] => {
    return tableColumns.map(col => ({
      id: col.id,
      label: col.label || col.id,
      visible: col.visible
    }));
  };

  return (
    <TooltipProvider>
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold">
              {filter === 'unverified' ? 'Unverified Transactions' :
                filter === 'profit_loss' ? 'Profit & Loss Transactions' :
                filter === 'balance_sheet' ? 'Balance Sheet Transactions' :
                filter === 'by_vendor' && vendorName ? `${vendorName} Transactions` :
                filter === 'review' ? 'Transactions Needing Review' :
                'All Transactions'}
            </h2>
            {isAccountReconciled && (
              <div className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                Reconciled
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleRefresh}
            >
              Refresh
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleExportCSV}
            >
              Export
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setIsReconcileDialogOpen(true)}
            >
              Reconcile
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setIsColumnsDialogOpen(true)}
            >
              Columns
            </Button>
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
                  <TableRow key={transaction.id}>
                    {/* Transaction row cells here */}
                    <TableCell>Transaction data</TableCell>
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
