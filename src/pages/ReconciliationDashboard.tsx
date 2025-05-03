import React, { useState, useEffect } from 'react';
import { useBookkeeping } from '@/context/BookkeepingContext';
import { Transaction } from '@/types';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BackToDashboard } from '@/components/header/BackToDashboard';
import DateRangeSelector from '@/components/DateRangeSelector';
import { toast } from '@/utils/toast';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

interface DateRange {
  startDate: Date | undefined;
  endDate: Date | undefined;
}

const ReconciliationDashboard: React.FC = () => {
  const { 
    transactions, 
    bankConnections, 
    fetchTransactionsForBankAccount,
    updateTransaction,
    loading
  } = useBookkeeping();
  
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [bankTransactions, setBankTransactions] = useState<Transaction[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [expectedEndBalance, setExpectedEndBalance] = useState<number | undefined>(undefined);
  const [calculatedEndBalance, setCalculatedEndBalance] = useState<number | undefined>(undefined);
  const [isReconciled, setIsReconciled] = useState<boolean>(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState<boolean>(false);
  
  useEffect(() => {
    if (bankConnections.length === 1) {
      setSelectedBankId(bankConnections[0].id);
    }
  }, [bankConnections]);
  
  useEffect(() => {
    if (selectedBankId) {
      loadBankTransactions();
    }
  }, [selectedBankId]);
  
  const loadBankTransactions = async () => {
    if (!selectedBankId) return;
    
    setIsLoadingTransactions(true);
    try {
      const fetchedTransactions = await fetchTransactionsForBankAccount(selectedBankId);
      setBankTransactions(fetchedTransactions);
      
      // Set default date range to last 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      setStartDate(thirtyDaysAgo);
      setEndDate(today);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setIsLoadingTransactions(false);
    }
  };
  
  const getFilteredTransactions = () => {
    if (!bankTransactions.length) return [];
    
    return bankTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      
      const afterStart = !startDate || transactionDate >= startDate;
      const beforeEnd = !endDate || transactionDate <= endDate;
      
      return afterStart && beforeEnd;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };
  
  const calculateBalance = () => {
    const filteredTransactions = getFilteredTransactions();
    
    if (filteredTransactions.length === 0) {
      setCalculatedEndBalance(undefined);
      return;
    }
    
    // Find the first transaction's balance or use 0
    const firstTransaction = filteredTransactions[0];
    let initialBalance = 0;
    
    // If we have balance info on the first transaction, use that minus the transaction amount
    if (firstTransaction.balance !== undefined) {
      initialBalance = firstTransaction.balance - firstTransaction.amount;
    }
    
    // Calculate the running balance
    let runningBalance = initialBalance;
    
    for (const transaction of filteredTransactions) {
      runningBalance += transaction.amount;
    }
    
    setCalculatedEndBalance(runningBalance);
    
    // Check if reconciled
    if (expectedEndBalance !== undefined) {
      const difference = Math.abs(expectedEndBalance - runningBalance);
      setIsReconciled(difference < 0.01); // Allow for tiny rounding errors
    } else {
      setIsReconciled(false);
    }
  };
  
  useEffect(() => {
    calculateBalance();
  }, [bankTransactions, startDate, endDate, expectedEndBalance]);
  
  const handleReconcile = async () => {
    if (!selectedBankId || !startDate || !endDate || expectedEndBalance === undefined) {
      toast.error('Missing required information for reconciliation');
      return;
    }
    
    try {
      const filteredTransactions = getFilteredTransactions();
      
      if (filteredTransactions.length === 0) {
        toast.error('No transactions to reconcile');
        return;
      }
      
      // Mark all transactions in this period as reconciled
      for (const transaction of filteredTransactions) {
        await updateTransaction({
          ...transaction,
          isReconciled: true
        });
      }
      
      toast.success('Successfully reconciled transactions');
      loadBankTransactions(); // Refresh data
    } catch (error) {
      console.error('Error during reconciliation:', error);
      toast.error('Failed to reconcile transactions');
    }
  };
  
  const filteredTransactions = getFilteredTransactions();
  const selectedBank = bankConnections.find(bank => bank.id === selectedBankId);
  
  const handleDateRangeChange = (startDate: Date | undefined, endDate: Date | undefined) => {
    setStartDate(startDate);
    setEndDate(endDate);
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Reconciliation Dashboard</h1>
        <BackToDashboard />
      </div>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Bank Statement Reconciliation</CardTitle>
            <CardDescription>
              Select a bank account and date range to reconcile your transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Bank Account</label>
                <Select
                  value={selectedBankId}
                  onValueChange={setSelectedBankId}
                  disabled={isLoadingTransactions || loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankConnections.map(bank => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.display_name || bank.bank_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-col">
                <label className="block text-sm font-medium mb-2">Statement Period</label>
                <DateRangeSelector
                  startDate={startDate}
                  endDate={endDate}
                  onRangeChange={handleDateRangeChange}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Expected Ending Balance</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter balance from your bank statement"
                  value={expectedEndBalance === undefined ? '' : expectedEndBalance}
                  onChange={(e) => setExpectedEndBalance(e.target.value === '' ? undefined : Number(e.target.value))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Calculated Balance</label>
                <div className="p-2 bg-muted rounded-md flex items-center justify-between">
                  <span className="font-medium">{calculatedEndBalance?.toFixed(2) || 'N/A'}</span>
                  
                  {expectedEndBalance !== undefined && calculatedEndBalance !== undefined && (
                    isReconciled ? (
                      <div className="flex items-center text-green-500 gap-1">
                        <Check className="h-4 w-4" />
                        <span>Reconciled</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-500 gap-1">
                        <AlertCircle className="h-4 w-4" />
                        <span>
                          Difference: {Math.abs(expectedEndBalance - calculatedEndBalance).toFixed(2)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
            
            {/* Reconciliation Status */}
            {selectedBankId && expectedEndBalance !== undefined && calculatedEndBalance !== undefined && (
              <Alert variant={isReconciled ? "default" : "destructive"} className="mb-6">
                {isReconciled ? (
                  <>
                    <Check className="h-4 w-4" />
                    <AlertTitle>Reconciliation Successful</AlertTitle>
                    <AlertDescription>
                      Your calculated balance matches the expected balance.
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Reconciliation Failed</AlertTitle>
                    <AlertDescription>
                      There is a difference of {Math.abs(expectedEndBalance - calculatedEndBalance).toFixed(2)} 
                      between your calculated balance and the expected balance.
                    </AlertDescription>
                  </>
                )}
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={loadBankTransactions}
              disabled={!selectedBankId || isLoadingTransactions}
            >
              Refresh Transactions
            </Button>
            <Button
              onClick={handleReconcile}
              disabled={
                !selectedBankId || 
                !startDate || 
                !endDate || 
                expectedEndBalance === undefined || 
                !isReconciled || 
                isLoadingTransactions
              }
            >
              Mark as Reconciled
            </Button>
          </CardFooter>
        </Card>
        
        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>
              Transactions for {selectedBank ? (selectedBank.display_name || selectedBank.bank_name) : 'Selected Account'}
            </CardTitle>
            <CardDescription>
              {filteredTransactions.length} transactions from {startDate ? format(startDate, 'MMM d, yyyy') : 'all time'} 
              to {endDate ? format(endDate, 'MMM d, yyyy') : 'today'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTransactions ? (
              <div className="text-center py-8">Loading transactions...</div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found for the selected criteria
              </div>
            ) : (
              <div className="border rounded-md overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="min-w-[300px]">Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{format(new Date(transaction.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="font-medium max-w-[300px] truncate">
                          {transaction.description}
                        </TableCell>
                        <TableCell className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                          <div className="flex items-center">
                            {transaction.amount >= 0 ? (
                              <ArrowUp className="h-3 w-3 mr-1" />
                            ) : (
                              <ArrowDown className="h-3 w-3 mr-1" />
                            )}
                            {Math.abs(transaction.amount).toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {transaction.balance !== undefined ? transaction.balance.toFixed(2) : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReconciliationDashboard;
