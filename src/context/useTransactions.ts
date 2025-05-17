
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Transaction, Vendor, FinancialSummary, Category } from '@/types';
import { toast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { isCSVFormatValid } from '@/utils/csvParser';
import { BankConnectionRow } from '@/types/supabase';
import { processTransactions, saveTransactionsToSupabase } from '@/context/transactionUtils';

export const useTransactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [bankConnections, setBankConnections] = useState<BankConnectionRow[]>([]);
  const [aiAnalyzeLoading, setAIAnalyzeLoading] = useState(false);
  const queryClient = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    enabled: !!user,
  }).data;

  useEffect(() => {
    if (user) {
      fetchBankConnections();
    }
  }, [user]);

  useEffect(() => {
    if (queryClient) {
      setTransactions(queryClient);
      setLoading(false);
    }
  }, [queryClient]);

  const fetchTransactions = useCallback(async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('bank_transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      // Map database format to our Transaction format
      const mappedTransactions: Transaction[] = data?.map(t => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: Number(t.amount),
        vendor: t.vendor || undefined,
        category: t.category || undefined,
        type: t.type as Transaction['type'] || undefined,
        statementType: t.statement_type as Transaction['statementType'] || undefined,
        isVerified: t.is_verified || false,
        vendorVerified: t.vendor_verified || false,
        confidenceScore: t.confidence_score ? Number(t.confidence_score) : undefined,
        bankAccountId: t.bank_account_id || undefined,
        balance: t.balance ? Number(t.balance) : undefined,
        accountId: t.account_id || undefined,
      })) || [];
      
      return mappedTransactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
      return [];
    }
  }, [user]);

  const fetchBankConnections = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('bank_connections')
        .select('*')
        .order('bank_name', { ascending: true });

      if (error) throw error;

      // Add display_name if not present
      const transformedData = data?.map(conn => ({
        ...conn,
        display_name: conn.display_name || conn.bank_name
      })) || [];

      setBankConnections(transformedData);
    } catch (error) {
      console.error('Error fetching bank connections:', error);
      toast.error('Failed to load bank connections');
    }
  }, [user]);

  const addTransactions = useCallback(async (newTransactions: Transaction[]) => {
    if (!user || !newTransactions.length) return;

    try {
      // Process transactions before saving to add any necessary metadata
      const processedTransactions = await processTransactions(newTransactions);
      
      // Save to Supabase
      const result = await saveTransactionsToSupabase(processedTransactions, user.id);
      
      if (!result.success) {
        throw new Error(`Failed to save some transactions: ${result.errors?.join(', ')}`);
      }

      // Update local state
      setTransactions(prev => [...result.transactions, ...prev]);
      
      return result.transactions;
    } catch (error) {
      console.error('Error adding transactions:', error);
      toast.error('Failed to add transactions');
    }
  }, [user]);

  const updateTransaction = useCallback(async (updatedTransaction: Transaction) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('bank_transactions')
        .update({
          date: updatedTransaction.date,
          description: updatedTransaction.description,
          amount: updatedTransaction.amount,
          vendor: updatedTransaction.vendor || null,
          category: updatedTransaction.category || null,
          type: updatedTransaction.type || null,
          statement_type: updatedTransaction.statementType || null,
          is_verified: updatedTransaction.isVerified,
          vendor_verified: updatedTransaction.vendorVerified || false,
          confidence_score: updatedTransaction.confidenceScore || null,
          bank_account_id: updatedTransaction.bankAccountId || null,
          balance: updatedTransaction.balance || null,
        })
        .eq('id', updatedTransaction.id);

      if (error) throw error;

      // Update local state
      setTransactions(prev => 
        prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
      );

      return true;
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
      return false;
    }
  }, [user]);

  const getAccountIdFromConnection = useCallback(async (bankConnectId: string) => {
    try {
      const connection = bankConnections.find(bc => bc.id === bankConnectId);
      if (connection) {
        return connection.id;
      }
      return null;
    } catch (error) {
      console.error('Error getting account ID:', error);
      return null;
    }
  }, [bankConnections]);

  const uploadCSV = useCallback(async (
    preparedTransactions: Transaction[], 
    bankConnectId?: string,
    initialBalance?: number,
    balanceDate?: Date
  ) => {
    if (!user || !preparedTransactions.length) return;

    try {
      let bankAccountId: string | null = null;
      
      if (bankConnectId) {
        // Get account ID from bank connection
        bankAccountId = await getAccountIdFromConnection(bankConnectId);
      }

      // Add bank account and account ID to transactions
      const transactionsWithAccount = preparedTransactions.map(t => ({
        ...t,
        bankAccountId: bankConnectId || undefined,
        accountId: bankAccountId || undefined
      }));

      // Calculate running balance for transactions
      const transactionsWithBalance = recalculateRunningBalances(
        transactionsWithAccount,
        initialBalance,
        balanceDate
      );
      
      // Save transactions to database
      await saveTransactionsToSupabase(transactionsWithBalance, user.id);

      // Update local state
      setTransactions(prev => [...transactionsWithBalance, ...prev]);

      toast.success(`${preparedTransactions.length} transactions uploaded successfully`);
    } catch (error) {
      console.error('Error uploading CSV:', error);
      toast.error('Failed to upload CSV');
    }
  }, [user, getAccountIdFromConnection]);

  const verifyTransaction = useCallback(async (
    id: string,
    category: string,
    type: Transaction['type'],
    statementType: Transaction['statementType']
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('bank_transactions')
        .update({
          category,
          type,
          statement_type: statementType,
          is_verified: true,
        })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setTransactions(prev => prev.map(t => 
        t.id === id ? { ...t, category, type, statementType, isVerified: true } : t
      ));

      toast.success('Transaction verified');
    } catch (error) {
      console.error('Error verifying transaction:', error);
      toast.error('Failed to verify transaction');
    }
  }, [user]);

  const deleteTransaction = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'No user is logged in' };

    try {
      const { error } = await supabase
        .from('bank_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setTransactions(prev => prev.filter(t => t.id !== id));
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete transaction' 
      };
    }
  }, [user]);

  const analyzeTransactionWithAI = useCallback(async (transaction: Transaction) => {
    if (!user) return null;
    
    try {
      setAIAnalyzeLoading(true);
      
      // Call the Supabase Edge Function for analyzing the transaction
      const { data, error } = await supabase.functions.invoke('analyze-transaction', {
        body: { description: transaction.description }
      });
      
      if (error) throw error;
      
      if (data && data.category) {
        // Update the transaction with the AI suggestion
        const updatedTransaction = {
          ...transaction,
          aiSuggestion: data.category,
          confidenceScore: data.confidence || 0
        };
        
        // Save to local state but don't update the database yet
        setTransactions(prev => 
          prev.map(t => t.id === transaction.id ? updatedTransaction : t)
        );
        
        return {
          category: data.category,
          confidence: data.confidence || 0
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error analyzing transaction with AI:', error);
      toast.error('Failed to analyze transaction');
      return null;
    } finally {
      setAIAnalyzeLoading(false);
    }
  }, [user]);

  const verifyVendor = useCallback(async (vendorName: string, approved: boolean) => {
    if (!user) return;

    try {
      // Update vendor_categorizations table
      const { error: vendorError } = await supabase
        .from('vendor_categorizations')
        .update({ verified: approved })
        .eq('vendor_name', vendorName);

      if (vendorError) throw vendorError;

      // Update all transactions with this vendor
      const { error: transactionError } = await supabase
        .from('bank_transactions')
        .update({ vendor_verified: approved })
        .eq('vendor', vendorName);

      if (transactionError) throw transactionError;

      // Update local state for transactions
      setTransactions(prev => prev.map(t => 
        t.vendor === vendorName ? { ...t, vendorVerified: approved } : t
      ));

      toast.success(`Vendor ${approved ? 'verified' : 'unverified'}`);
    } catch (error) {
      console.error('Error verifying vendor:', error);
      toast.error('Failed to verify vendor');
    }
  }, [user]);

  const getFilteredTransactions = useCallback((
    statementType?: Transaction['statementType'],
    verified?: boolean,
    vendor?: string
  ): Transaction[] => {
    return transactions.filter(t => {
      if (statementType !== undefined && t.statementType !== statementType) {
        return false;
      }
      if (verified !== undefined && t.isVerified !== verified) {
        return false;
      }
      if (vendor !== undefined && t.vendor !== vendor) {
        return false;
      }
      return true;
    });
  }, [transactions]);

  const recalculateRunningBalances = (
    transactionsToUpdate: Transaction[],
    initialBalance = 0,
    balanceDate?: Date
  ): Transaction[] => {
    if (!transactionsToUpdate.length) return [];

    // Sort transactions by date (ascending)
    const sortedTransactions = [...transactionsToUpdate].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    let runningBalance = initialBalance;

    // Calculate running balance
    return sortedTransactions.map((transaction) => {
      runningBalance += transaction.amount;
      return {
        ...transaction,
        balance: runningBalance
      };
    });
  };

  const getVendorsCount = useCallback((): Record<string, number> => {
    const counts: Record<string, number> = {};
    
    transactions.forEach(transaction => {
      if (transaction.vendor) {
        counts[transaction.vendor] = (counts[transaction.vendor] || 0) + 1;
      }
    });
    
    return counts;
  }, [transactions]);

  const fetchTransactionsForBankAccount = useCallback(async (
    bankAccountId: string
  ): Promise<Transaction[]> => {
    if (!user || !bankAccountId) return [];

    try {
      const { data, error } = await supabase
        .from('bank_transactions')
        .select('*')
        .eq('bank_account_id', bankAccountId)
        .order('date', { ascending: false });

      if (error) throw error;

      // Map database format to our Transaction format
      const bankTransactions = data?.map(t => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: Number(t.amount),
        vendor: t.vendor || undefined,
        category: t.category || undefined,
        type: t.type as Transaction['type'] || undefined,
        statementType: t.statement_type as Transaction['statementType'] || undefined,
        isVerified: t.is_verified || false,
        vendorVerified: t.vendor_verified || false,
        confidenceScore: t.confidence_score ? Number(t.confidence_score) : undefined,
        bankAccountId: t.bank_account_id || undefined,
        balance: t.balance ? Number(t.balance) : undefined,
        accountId: t.account_id || undefined,
      })) || [];
      
      return bankTransactions;
    } catch (error) {
      console.error('Error fetching bank transactions:', error);
      toast.error('Failed to load bank transactions');
      return [];
    }
  }, [user]);

  const getBankConnectionById = useCallback((id: string): BankConnectionRow | undefined => {
    return bankConnections.find(connection => connection.id === id);
  }, [bankConnections]);

  const findSimilarTransactions = async (
    vendorName: string,
    allTransactions: Transaction[]
  ): Promise<Transaction[]> => {
    // This is a simplistic implementation - ideally would use embeddings/ML
    return allTransactions.filter(t => 
      t.vendor === vendorName || 
      t.description.toLowerCase().includes(vendorName.toLowerCase())
    );
  };

  const removeDuplicateVendors = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('remove-duplicate-vendors');
      
      if (error) throw error;
      
      toast.success(`${data?.count || 0} duplicate vendors merged`);
      await fetchTransactions();
    } catch (error) {
      console.error('Error removing duplicate vendors:', error);
      toast.error('Failed to remove duplicate vendors');
    }
  };

  const batchVerifyVendorTransactions = async (
    vendorName: string,
    category: string,
    type: Transaction['type'],
    statementType: Transaction['statementType']
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('bank_transactions')
        .update({
          category,
          type,
          statement_type: statementType,
          is_verified: true,
        })
        .eq('vendor', vendorName)
        .eq('is_verified', false);

      if (error) throw error;

      // Update local state
      setTransactions(prev => prev.map(t => 
        t.vendor === vendorName && !t.isVerified
          ? { ...t, category, type, statementType, isVerified: true }
          : t
      ));

      toast.success('All transactions for this vendor have been verified');
    } catch (error) {
      console.error('Error batch verifying transactions:', error);
      toast.error('Failed to verify transactions');
    }
  };

  const getVendorsList = useCallback(() => {
    const countsMap = getVendorsCount();
    
    // Find verified vendors in the transactions
    const verifiedVendors: Record<string, boolean> = {};
    transactions.forEach(t => {
      if (t.vendor && t.vendorVerified) {
        verifiedVendors[t.vendor] = true;
      }
    });
    
    const vendorList = Object.entries(countsMap).map(([name, count]) => ({
      name,
      count,
      verified: verifiedVendors[name] || false
    }));
    
    return vendorList;
  }, [transactions, getVendorsCount]);

  return {
    transactions,
    loading,
    aiAnalyzeLoading,
    bankConnections,
    addTransactions,
    updateTransaction,
    verifyTransaction,
    verifyVendor,
    uploadCSV,
    getFilteredTransactions,
    getVendorsList,
    analyzeTransactionWithAI,
    recalculateRunningBalances,
    getBankConnectionById,
    getAccountIdFromConnection,
    removeDuplicateVendors,
    fetchTransactionsForBankAccount,
    batchVerifyVendorTransactions,
    fetchTransactions,
    findSimilarTransactions,
    deleteTransaction,
  };
};
