
// Update the import section at the top
import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Transaction } from "@/types";
import { useBookkeeping } from "@/context/BookkeepingContext";
import { useSettings } from "@/context/SettingsContext";
import { toast } from '@/utils/toast';
import { isBalanceReconciled } from '@/utils/csvParser';
import { TooltipProvider } from "@/components/ui/tooltip";
import TableHeaderComponent from './TableHeader';
import TransactionRow from './TransactionRow';
import { useTableSort } from '@/hooks/useTableSort';
import { useTransactionFilter } from '@/hooks/useTransactionFilter';
import ReconcileDialog from '../ReconcileDialog';
import VendorNameEditor from '../vendor/VendorNameEditor';
import BusinessContextQuestionnaire from '../business/BusinessContextQuestionnaire';
import { exportToCSV } from '@/utils/csvParser';
import ConfidenceScore from './ConfidenceScore';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/utils/errorLogger';

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
    updateTransaction,
    deleteTransaction,
    vendors,
    getBankConnectionById,
    getVendorsList
  } = useBookkeeping();
  
  const {
    currency,
    tableColumns,
    toggleColumn
  } = useSettings();

  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [isReconcileDialogOpen, setIsReconcileDialogOpen] = useState(false);
  const [isVendorEditorOpen, setIsVendorEditorOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | undefined>();
  const [reconciliationBalance, setReconciliationBalance] = useState<number | undefined>(expectedEndBalance);
  const [allVendors, setAllVendors] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  const { sortField, sortDirection, handleSort, sortTransactions } = useTableSort();
  const { filterTransactions } = useTransactionFilter();

  useEffect(() => {
    const vendorNames = vendors.map(v => v.name);
    const transactionVendors = transactions
      .map(t => t.vendor)
      .filter((v): v is string => v !== undefined && v !== null && v !== "");
    
    const combinedVendors = Array.from(new Set([...vendorNames, ...transactionVendors]));
    
    setAllVendors(combinedVendors);
  }, [vendors, transactions]);

  const filteredTransactions = filterTransactions(transactions, filter, vendorName);
  const sortedTransactions = sortTransactions(filteredTransactions);

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

  const handleVendorChange = (transaction: Transaction, vendorName: string) => {
    if (vendorName === 'add-new') {
      setCurrentTransaction(transaction);
      setIsVendorEditorOpen(true);
      return;
    }
    
    const updatedTransaction = { ...transaction, vendor: vendorName };
    updateTransaction(updatedTransaction);
  };

  const getBankName = (transaction: Transaction) => {
    if (!transaction.bankAccountId) return "Unknown";
    const connection = getBankConnectionById(transaction.bankAccountId);
    return connection?.display_name || connection?.bank_name || "Unknown";
  };

  const isAccountReconciled = reconciliationBalance !== undefined && 
    transactions.length > 0 && 
    isBalanceReconciled(transactions, reconciliationBalance);

  const mapTableColumnsToColumnSelector = () => {
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

  const handleSelectTransaction = (transactionId: string, isSelected: boolean) => {
    setSelectedTransactions(prev => 
      isSelected 
        ? [...prev, transactionId]
        : prev.filter(id => id !== transactionId)
    );
  };

  const handleSelectAllTransactions = (checked: boolean) => {
    if (checked) {
      setSelectedTransactions(sortedTransactions.map(t => t.id));
    } else {
      setSelectedTransactions([]);
    }
  };

  const batchExtractVendors = async () => {
    if (selectedTransactions.length === 0) {
      toast.error('No transactions selected');
      return;
    }

    setProcessing(true);
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (const id of selectedTransactions) {
        const transaction = transactions.find(t => t.id === id);
        if (!transaction) continue;

        try {
          const { data, error } = await supabase.functions.invoke('analyze-transaction-vendor', {
            body: { 
              description: transaction.description,
              existingVendors: allVendors
            }
          });
          
          if (error) throw error;
          
          if (!data || !data.vendor) {
            throw new Error('No vendor data returned from analysis');
          }
          
          const vendorName = data.vendor;
          const updatedTransaction = { ...transaction, vendor: vendorName };
          
          if (!data.isExisting && data.category) {
            updatedTransaction.category = data.category;
            updatedTransaction.confidenceScore = data.confidence;
            updatedTransaction.type = data.type;
            updatedTransaction.statementType = data.statementType;
          }
          
          await updateTransaction(updatedTransaction);
          successCount++;
        } catch (err) {
          logError("batchExtractVendors", err);
          failCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`Successfully extracted vendors for ${successCount} transactions`);
      }
      
      if (failCount > 0) {
        toast.error(`Failed to extract vendors for ${failCount} transactions`);
      }
    } catch (err) {
      logError("batchExtractVendors", err);
      toast.error('Failed to process batch vendor extraction');
    } finally {
      setProcessing(false);
      setSelectedTransactions([]);
    }
  };

  const batchDeleteTransactions = async () => {
    if (selectedTransactions.length === 0) {
      toast.error('No transactions selected');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedTransactions.length} transactions?`)) {
      return;
    }

    setProcessing(true);
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (const id of selectedTransactions) {
        try {
          await deleteTransaction(id);
          successCount++;
        } catch (err) {
          logError("batchDeleteTransactions", err);
          failCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`Successfully deleted ${successCount} transactions`);
      }
      
      if (failCount > 0) {
        toast.error(`Failed to delete ${failCount} transactions`);
      }
    } catch (err) {
      logError("batchDeleteTransactions", err);
      toast.error('Failed to process batch deletion');
    } finally {
      setProcessing(false);
      setSelectedTransactions([]);
    }
  };

  const batchAssignVendor = async (vendorName: string) => {
    if (selectedTransactions.length === 0) {
      toast.error('No transactions selected');
      return;
    }

    setProcessing(true);
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (const id of selectedTransactions) {
        const transaction = transactions.find(t => t.id === id);
        if (!transaction) continue;

        try {
          const updatedTransaction = { ...transaction, vendor: vendorName };
          await updateTransaction(updatedTransaction);
          successCount++;
        } catch (err) {
          logError("batchAssignVendor", err);
          failCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`Successfully assigned vendor "${vendorName}" to ${successCount} transactions`);
      }
      
      if (failCount > 0) {
        toast.error(`Failed to assign vendor to ${failCount} transactions`);
      }
    } catch (err) {
      logError("batchAssignVendor", err);
      toast.error('Failed to process batch vendor assignment');
    } finally {
      setProcessing(false);
      setSelectedTransactions([]);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-4 animate-fade-in">
        <TableHeaderComponent
          filter={filter}
          vendorName={vendorName}
          isAccountReconciled={isAccountReconciled}
          onRefresh={handleRefresh}
          onExport={handleExportCSV}
          onUpload={() => setIsVendorEditorOpen(true)}
          onReconcile={() => setIsReconcileDialogOpen(true)}
          onAddVendor={() => {
            setCurrentTransaction(undefined);
            setIsVendorEditorOpen(true);
          }}
          onToggleColumn={handleToggleColumn}
          columns={mapTableColumnsToColumnSelector()}
        />
        
        {selectedTransactions.length > 0 && (
          <div className="bg-muted/30 p-3 rounded-md flex items-center justify-between">
            <div>
              <span className="font-medium">{selectedTransactions.length} transactions selected</span>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={processing}>
                    Batch Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Batch Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={batchExtractVendors}>
                    Extract Vendors
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsVendorEditorOpen(true)}>
                    Assign Vendor
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={batchDeleteTransactions}
                  >
                    Delete Transactions
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedTransactions([])}
                disabled={processing}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}
        
        <div className="w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell className="w-10 p-4">
                  <Checkbox 
                    checked={selectedTransactions.length > 0 && selectedTransactions.length === sortedTransactions.length}
                    onCheckedChange={handleSelectAllTransactions}
                    aria-label="Select all transactions"
                    disabled={processing}
                  />
                </TableCell>
                {tableColumns.filter(column => column.visible).map(column => (
                  <TableCell 
                    key={column.id} 
                    className="cursor-pointer"
                    onClick={() => handleSort(column.id)}
                  >
                    {column.name || column.label} 
                    {sortField === column.id && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tableColumns.filter(col => col.visible).length + 2} className="text-center py-6 text-muted-foreground">
                    No transactions to display
                  </TableCell>
                </TableRow>
              ) : (
                sortedTransactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    currency={currency}
                    tableColumns={tableColumns}
                    uniqueVendors={allVendors}
                    onVendorChange={handleVendorChange}
                    getBankName={getBankName}
                    renderConfidenceScore={(score) => (
                      <ConfidenceScore score={score} />
                    )}
                    isSelected={selectedTransactions.includes(transaction.id)}
                    onSelectChange={handleSelectTransaction}
                  />
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
          onSave={(vendor) => {
            if (selectedTransactions.length > 0) {
              batchAssignVendor(vendor.name);
            } else {
              if (onRefresh) onRefresh();
            }
            setIsVendorEditorOpen(false);
          }}
          isProcessing={processing}
          transaction={currentTransaction}
        />
      </div>
    </TooltipProvider>
  );
};

export default TransactionTable;
