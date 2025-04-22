
import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
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
import VendorEditor from '../VendorEditor';
import { exportToCSV } from '@/utils/csvParser';
import ColumnSelector from '../ColumnSelector';
import ConfidenceScore from './ConfidenceScore';

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
    vendors,
    getBankConnectionById,
    getVendorsList
  } = useBookkeeping();
  
  const {
    currency,
    tableColumns,
    toggleColumn
  } = useSettings();

  const [isReconcileDialogOpen, setIsReconcileDialogOpen] = useState(false);
  const [isVendorEditorOpen, setIsVendorEditorOpen] = useState(false);
  const [reconciliationBalance, setReconciliationBalance] = useState<number | undefined>(expectedEndBalance);
  const [allVendors, setAllVendors] = useState<string[]>([]);

  const { sortField, sortDirection, handleSort, sortTransactions } = useTableSort();
  const { filterTransactions } = useTransactionFilter();

  // Get all vendors from the database and transactions
  useEffect(() => {
    if (vendors) {
      // Extract vendor names from vendors array
      const vendorNames = vendors.map(v => v.name);
      
      // Extract unique vendor names from transactions
      const transactionVendors = transactions
        .map(t => t.vendor)
        .filter((v): v is string => v !== undefined && v !== null && v !== "");
      
      // Combine both arrays and remove duplicates
      const combinedVendors = Array.from(new Set([...vendorNames, ...transactionVendors]));
      
      // Debug
      console.log('Vendor names from vendors array:', vendorNames);
      console.log('Transaction vendors:', transactionVendors);
      console.log('Combined vendors:', combinedVendors);
      
      setAllVendors(combinedVendors);
    }
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

  // Update function signature to match TableHeader's expected signature
  const handleToggleColumn = (columnId: string) => {
    const column = tableColumns.find(col => col.id === columnId);
    if (column) {
      toggleColumn(columnId, !column.visible);
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
          onAddVendor={() => setIsVendorEditorOpen(true)}
          onToggleColumn={handleToggleColumn}
          columns={mapTableColumnsToColumnSelector()}
        />
        
        <div className="w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableCell colSpan={tableColumns.filter(col => col.visible).length + 1} className="text-center py-6 text-muted-foreground">
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
          onSave={() => {
            setIsVendorEditorOpen(false);
            if (onRefresh) onRefresh();
          }}
        />
      </div>
    </TooltipProvider>
  );
};

export default TransactionTable;
