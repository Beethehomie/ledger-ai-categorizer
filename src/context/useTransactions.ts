import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Transaction } from '@/types';
import { toast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { parseCSV, isBalanceReconciled } from '@/utils/csvParser';
import { useQueryClient } from '@tanstack/react-query';
import { 
  saveTransactionsToSupabase, 
  processTransactions,
  calculateRunningBalance 
} from '@/context/bookkeeping/transactionUtils';
import { BankConnectionRow } from '@/types/supabase';
import { 
  findDuplicatesInDatabase, 
  reconcileAccountBalance, 
  updateTransactionBalances,
  getBankAccountIdFromConnection 
} from '@/services/bookkeepingService';

export const useTransactions = (
  bankConnections: BankConnectionRow[]
) => {
  const { session } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [aiAnalyzeLoading, setAiAnalyzeLoading] = useState<boolean>(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!session) return;

    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('bank_transactions')
          .select('*')
          .order('date', { ascending: false });
          
        if (error) {
          console.error('Error fetching transactions:', error);
          return;
        }
        
        if (data) {
          const fetchedTransactions: Transaction[] = data.map((t) => ({
            id: t.id,
            date: t.date,
            description: t.description,
            amount: Number(t.amount),
            category: t.category || undefined,
            type: t.type as Transaction['type'] || undefined,
            statementType: t.statement_type as Transaction['statementType'] || undefined,
            isVerified: t.is_verified || false,
            aiSuggestion: undefined,
            vendor: t.vendor || undefined,
            vendorVerified: t.vendor_verified || false,
            confidenceScore: t.confidence_score ? Number(t.confidence_score) : undefined,
            bankAccountId: t.bank_connection_id || undefined,
            bankAccountName: undefined,
            balance: t.balance || undefined,
          }));
          
          if (fetchedTransactions.length > 0) {
            for (const transaction of fetchedTransactions) {
              if (transaction.bankAccountId) {
                const bankConnection = bankConnections.find(conn => conn.id === transaction.bankAccountId);
                if (bankConnection) {
                  transaction.bankAccountName = bankConnection.display_name || bankConnection.bank_name;
                }
              }
            }
          }
          
          setTransactions(fetchedTransactions);
        }
      } catch (err) {
        console.error('Error in fetchTransactions:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransactions();
  }, [session, bankConnections]);

  const addTransactions = async (newTransactions: Transaction[]): Promise<Transaction[]> => {
    if (!session) {
      toast.error('You must be logged in to add transactions');
      return [];
    }
    
    const processedTransactions = processTransactions(newTransactions);
    
    try {
      const { transactions: savedTransactions } = await saveTransactionsToSupabase(
        processedTransactions,
        session.user.id
      );
      
      setTransactions(prev => [...prev, ...savedTransactions]);
      toast.success(`Added ${savedTransactions.length} transactions`);
      
      return savedTransactions;
    } catch (err: any) {
      console.error('Error adding transactions:', err);
      toast.error('Failed to add transactions');
      throw err;
    }
  };

  const updateTransaction = async (updatedTransaction: Transaction): Promise<boolean> => {
    if (!session) {
      toast.error('You must be logged in to update transactions');
      return false;
    }
    
    try {
      const { error } = await supabase
        .from('bank_transactions')
        .update({
          description: updatedTransaction.description,
          amount: updatedTransaction.amount,
          category: updatedTransaction.category || null,
          type: updatedTransaction.type || null,
          statement_type: updatedTransaction.statementType || null,
          is_verified: updatedTransaction.isVerified,
          vendor: updatedTransaction.vendor || null,
          vendor_verified: updatedTransaction.vendorVerified || false,
          confidence_score: updatedTransaction.confidenceScore || null,
          balance: updatedTransaction.balance || null
        })
        .eq('id', updatedTransaction.id);
        
      if (error) {
        throw error;
      }
      
      setTransactions(prev => 
        prev.map(transaction => 
          transaction.id === updatedTransaction.id ? updatedTransaction : transaction
        )
      );
      
      return true;
    } catch (err: any) {
      console.error('Error updating transaction in Supabase:', err);
      toast.error('Failed to update transaction in database');
      return false;
    }
  };

  const analyzeTransactionWithAI = async (transaction: Transaction) => {
    if (!session) {
      toast.error('You must be logged in to use AI categorization');
      return null;
    }
    
    setAiAnalyzeLoading(true);
    
    try {
      const categoryNames = []; // This will be passed in from the context
      
      // Get business context from user profile
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('business_context')
        .eq('id', session.user.id)
        .single();
      
      console.log('Analyzing transaction:', {
        description: transaction.description,
        amount: transaction.amount,
        existingCategories: categoryNames,
        businessContext: userProfile?.business_context
      });
      
      const { data, error } = await supabase.functions.invoke('analyze-transaction', {
        body: { 
          description: transaction.description,
          amount: transaction.amount,
          existingCategories: categoryNames,
          businessContext: userProfile?.business_context || null
        }
      });
      
      if (error) {
        console.error('Error in analyze-transaction function:', error);
        throw error;
      }
      
      console.log('AI analysis result:', data);
      
      if (data) {
        setTransactions(prev => 
          prev.map(t => {
            if (t.id === transaction.id) {
              return {
                ...t,
                aiSuggestion: data.category,
                confidenceScore: data.confidence,
                type: data.confidence > 0.85 ? data.type : t.type,
                statementType: data.confidence > 0.85 ? data.statementType : t.statementType,
                vendor: data.vendor || t.vendor
              };
            }
            return t;
          })
        );
      }
      
      return data;
    } catch (err: any) {
      console.error('Error analyzing transaction with AI:', err);
      toast.error('Failed to analyze transaction with AI. Check if the edge function is properly deployed.');
      return null;
    } finally {
      setAiAnalyzeLoading(false);
    }
  };

  // Modified uploadCSV function to take in prepared transactions directly and set account_id
  const uploadCSV = async (
    preparedTransactions: Transaction[],
    bankConnectionId?: string, 
    initialBalance: number = 0,
    balanceDate: Date = new Date(),
    endBalance?: number
  ) => {
    if (!session) {
      toast.error('You must be logged in to upload transactions');
      return;
    }
    
    setLoading(true);
    try {
      let bankConnection: BankConnectionRow | undefined;
      if (bankConnectionId) {
        bankConnection = bankConnections.find(conn => conn.id === bankConnectionId);
      }
      
      // If we have a bank connection ID, try to get the corresponding account ID
      let accountId: string | null = null;
      if (bankConnectionId) {
        accountId = await getBankAccountIdFromConnection(bankConnectionId);
        if (!accountId) {
          console.warn('Could not find account ID for bank connection:', bankConnectionId);
          // Continue anyway, we'll use bankConnectionId directly as a fallback
          accountId = bankConnectionId;
        } else {
          console.log('Found account ID for bank connection:', accountId);
        }
      }
      
      const processCSVTransactions = async () => {
        const processedTransactions: Transaction[] = [];
        
        for (const transaction of preparedTransactions) {
          if (bankConnectionId && bankConnection) {
            transaction.bankAccountId = bankConnectionId;
            transaction.bankAccountName = bankConnection.display_name || bankConnection.bank_name;
            
            // Set the account ID for RLS policy compliance
            if (accountId) {
              transaction.accountId = accountId;
            }
          }
          
          processedTransactions.push(transaction);
        }
        
        // Check for duplicates before saving
        const duplicates = await findDuplicatesInDatabase(processedTransactions);
        if (duplicates.length > 0) {
          toast.warning(`Found ${duplicates.length} duplicate transactions. These will be skipped.`);
          // Filter out duplicates
          const uniqueTransactions = processedTransactions.filter(
            transaction => !duplicates.some(d => d.id === transaction.id)
          );
          
          if (uniqueTransactions.length === 0) {
            toast.error('No unique transactions to import');
            setLoading(false);
            return;
          }
          
          // Continue with unique transactions only
          const transactionsWithBalance = calculateRunningBalance(uniqueTransactions, initialBalance, balanceDate);
          
          try {
            const { transactions: savedTransactions } = await saveTransactionsToSupabase(
              transactionsWithBalance,
              session.user.id
            );
            
            setTransactions(prevTransactions => [...prevTransactions, ...savedTransactions]);
            
            // Check reconciliation if endBalance is provided
            if (endBalance !== undefined && bankConnectionId && savedTransactions.length > 0) {
              const isReconciled = await reconcileAccountBalance(bankConnectionId, endBalance);
              
              if (isReconciled) {
                toast.success('Bank statement successfully reconciled!');
              } else {
                const lastTransactionBalance = savedTransactions[savedTransactions.length - 1].balance || 0;
                const difference = Math.abs((lastTransactionBalance - endBalance));
                toast.warning(
                  `Ending balance (${endBalance.toFixed(2)}) doesn't match calculated balance (${lastTransactionBalance.toFixed(2)}). Difference: ${difference.toFixed(2)}`,
                  { duration: 6000 }
                );
              }
            }
            
            toast.success(`Successfully processed ${savedTransactions.length} transactions`);
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            
          } catch (err: any) {
            console.error('Error saving transactions to Supabase:', err);
            toast.error('Failed to save transactions to database');
          }
        } else {
          // No duplicates, process all transactions
          const transactionsWithBalance = calculateRunningBalance(processedTransactions, initialBalance, balanceDate);
          
          try {
            const { transactions: savedTransactions } = await saveTransactionsToSupabase(
              transactionsWithBalance,
              session.user.id
            );
            
            setTransactions(prevTransactions => [...prevTransactions, ...savedTransactions]);
            
            // Check reconciliation if endBalance is provided
            if (endBalance !== undefined && bankConnectionId && savedTransactions.length > 0) {
              const isReconciled = await reconcileAccountBalance(bankConnectionId, endBalance);
              
              if (isReconciled) {
                toast.success('Bank statement successfully reconciled!');
              } else {
                const lastTransactionBalance = savedTransactions[savedTransactions.length - 1].balance || 0;
                const difference = Math.abs((lastTransactionBalance - endBalance));
                toast.warning(
                  `Ending balance (${endBalance.toFixed(2)}) doesn't match calculated balance (${lastTransactionBalance.toFixed(2)}). Difference: ${difference.toFixed(2)}`,
                  { duration: 6000 }
                );
              }
            }
            
            toast.success(`Successfully processed ${savedTransactions.length} transactions`);
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            
          } catch (err: any) {
            console.error('Error saving transactions to Supabase:', err);
            toast.error('Failed to save transactions to database');
          }
        }
      };
      
      await processCSVTransactions();
      
    } catch (err: any) {
      console.error('Error in uploadCSV:', err);
      toast.error('Failed to process CSV file');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionsForBankAccount = async (bankAccountId: string): Promise<Transaction[]> => {
    if (!session) {
      toast.error('You must be logged in to fetch transactions');
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .from('bank_transactions')
        .select('*')
        .eq('bank_connection_id', bankAccountId)
        .order('date', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      if (data) {
        const bankTransactions: Transaction[] = data.map((t) => ({
          id: t.id,
          date: t.date,
          description: t.description,
          amount: Number(t.amount),
          category: t.category || undefined,
          type: t.type as Transaction['type'] || undefined,
          statementType: t.statement_type as Transaction['statementType'] || undefined,
          isVerified: t.is_verified || false,
          aiSuggestion: undefined,
          vendor: t.vendor || undefined,
          vendorVerified: t.vendor_verified || false,
          confidenceScore: t.confidence_score ? Number(t.confidence_score) : undefined,
          bankAccountId: t.bank_connection_id || undefined,
          bankAccountName: undefined,
          balance: t.balance || undefined,
        }));
        
        const bankConnection = bankConnections.find(conn => conn.id === bankAccountId);
        if (bankConnection) {
          for (const transaction of bankTransactions) {
            transaction.bankAccountName = bankConnection.display_name || bankConnection.bank_name;
          }
        }
        
        return bankTransactions;
      }
      
      return [];
    } catch (err: any) {
      console.error('Error fetching transactions for bank account:', err);
      toast.error('Failed to fetch transactions for this account');
      return [];
    }
  };

  const deleteTransaction = async (id: string): Promise<boolean> => {
    if (!session) {
      toast.error('You must be logged in to delete transactions');
      return false;
    }
    
    try {
      const { error } = await supabase
        .from('bank_transactions')
        .delete()
        .eq('id', id);
        
      if (error) {
        throw error;
      }
      
      setTransactions(prev => prev.filter(transaction => transaction.id !== id));
      return true;
    } catch (err: any) {
      console.error('Error deleting transaction:', err);
      toast.error('Failed to delete transaction');
      return false;
    }
  };

  const getFilteredTransactions = (
    statementType?: Transaction['statementType'], 
    verified?: boolean,
    vendor?: string
  ) => {
    return transactions.filter(transaction => {
      let include = true;
      
      if (statementType !== undefined) {
        include = include && transaction.statementType === statementType;
      }
      
      if (verified !== undefined) {
        include = include && transaction.isVerified === verified;
      }
      
      if (vendor !== undefined) {
        include = include && transaction.vendor === vendor;
      }
      
      return include;
    });
  };
  
  const filterTransactionsByDate = (
    startDate?: Date,
    endDate?: Date
  ) => {
    if (!startDate && !endDate) {
      return transactions;
    }
    
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      
      if (startDate && endDate) {
        return transactionDate >= startDate && transactionDate <= endDate;
      }
      
      if (startDate && !endDate) {
        return transactionDate >= startDate;
      }
      
      if (!startDate && endDate) {
        return transactionDate <= endDate;
      }
      
      return true;
    });
  };

  const getBankConnectionById = (id: string) => {
    return bankConnections.find(conn => conn.id === id);
  };

  const fetchTransactions = async (): Promise<void> => {
    if (!session) {
      toast.error('You must be logged in to fetch transactions');
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bank_transactions')
        .select('*')
        .order('date', { ascending: false });
        
      if (error) {
        console.error('Error fetching transactions:', error);
        toast.error('Failed to fetch transactions');
        return;
      }
      
      if (data) {
        const fetchedTransactions: Transaction[] = data.map((t) => ({
          id: t.id,
          date: t.date,
          description: t.description,
          amount: Number(t.amount),
          category: t.category || undefined,
          type: t.type as Transaction['type'] || undefined,
          statementType: t.statement_type as Transaction['statementType'] || undefined,
          isVerified: t.is_verified || false,
          aiSuggestion: undefined,
          vendor: t.vendor || undefined,
          vendorVerified: t.vendor_verified || false,
          confidenceScore: t.confidence_score ? Number(t.confidence_score) : undefined,
          bankAccountId: t.bank_connection_id || undefined,
          bankAccountName: undefined,
          balance: t.balance || undefined,
        }));
        
        if (fetchedTransactions.length > 0) {
          for (const transaction of fetchedTransactions) {
            if (transaction.bankAccountId) {
              const bankConnection = bankConnections.find(conn => conn.id === transaction.bankAccountId);
              if (bankConnection) {
                transaction.bankAccountName = bankConnection.display_name || bankConnection.bank_name;
              }
            }
          }
        }
        
        setTransactions(fetchedTransactions);
        toast.success('Transactions refreshed successfully');
      }
    } catch (err) {
      console.error('Error in fetchTransactions:', err);
      toast.error('Failed to refresh transactions');
    } finally {
      setLoading(false);
    }
  };

  // New function to recalculate running balances for a bank account
  const recalculateRunningBalances = async (
    bankAccountId: string,
    initialBalance: number = 0
  ): Promise<boolean> => {
    if (!session) {
      toast.error('You must be logged in to recalculate balances');
      return false;
    }
    
    try {
      // Fetch all transactions for this account
      const accountTransactions = await fetchTransactionsForBankAccount(bankAccountId);
      
      if (accountTransactions.length === 0) {
        toast.warning('No transactions found for this account');
        return false;
      }
      
      // Sort by date
      const sortedTransactions = [...accountTransactions].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateA - dateB;
      });
      
      // Calculate running balance
      let runningBalance = initialBalance;
      const updatedTransactions: Transaction[] = [];
      
      for (const transaction of sortedTransactions) {
        runningBalance += transaction.amount;
        updatedTransactions.push({
          ...transaction,
          balance: Number(runningBalance.toFixed(2))
        });
      }
      
      // Update transactions in database
      for (const transaction of updatedTransactions) {
        const { error } = await supabase
          .from('bank_transactions')
          .update({ balance: transaction.balance })
          .eq('id', transaction.id);
          
        if (error) {
          console.error('Error updating balance:', error);
          toast.error('Failed to update balances');
          return false;
        }
      }
      
      // Update local state
      setTransactions(prev => prev.map(t => {
        const updatedTransaction = updatedTransactions.find(ut => ut.id === t.id);
        return updatedTransaction || t;
      }));
      
      toast.success('Running balances recalculated successfully');
      return true;
    } catch (err) {
      console.error('Error in recalculateRunningBalances:', err);
      toast.error('Failed to recalculate balances');
      return false;
    }
  };

  return {
    transactions,
    loading,
    aiAnalyzeLoading,
    addTransactions,
    updateTransaction,
    analyzeTransactionWithAI: analyzeTransactionWithAI,
    uploadCSV,
    getFilteredTransactions,
    filterTransactionsByDate,
    fetchTransactionsForBankAccount,
    getBankConnectionById,
    setTransactions,
    fetchTransactions,
    deleteTransaction,
    recalculateRunningBalances,
    getBankAccountIdFromConnection
  };
};
