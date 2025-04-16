import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { Transaction } from '@/types';
import { toast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { parseCSV, CSVParseResult } from '@/utils/csvParser';
import { useQueryClient } from '@tanstack/react-query';
import { 
  saveTransactionsToSupabase, 
  calculateRunningBalance, 
  processTransactions 
} from './transactionUtils';
import { BankConnectionRow } from '@/types/supabase';

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

  const addTransactions = async (newTransactions: Transaction[]) => {
    if (!session) {
      toast.error('You must be logged in to add transactions');
      return;
    }
    
    const processedTransactions = processTransactions(newTransactions);
    
    try {
      const { transactions: savedTransactions } = await saveTransactionsToSupabase(
        processedTransactions,
        session.user.id
      );
      
      setTransactions(prev => [...prev, ...savedTransactions]);
      toast.success(`Added ${savedTransactions.length} transactions`);
    } catch (err: any) {
      console.error('Error adding transactions:', err);
    }
  };

  const updateTransaction = async (updatedTransaction: Transaction) => {
    if (!session) {
      toast.error('You must be logged in to update transactions');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('bank_transactions')
        .update({
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
      
    } catch (err: any) {
      console.error('Error updating transaction in Supabase:', err);
      toast.error('Failed to update transaction in database');
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
      
      console.log('Analyzing transaction:', {
        description: transaction.description,
        amount: transaction.amount,
        existingCategories: categoryNames
      });
      
      const { data, error } = await supabase.functions.invoke('analyze-transaction', {
        body: { 
          description: transaction.description,
          amount: transaction.amount,
          existingCategories: categoryNames
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
                statementType: data.confidence > 0.85 ? data.statementType : t.statementType
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

  const uploadCSV = async (
    csvString: string, 
    bankConnectionId?: string, 
    initialBalance: number =
    0,
    balanceDate: Date = new Date(),
    endBalance?: number
  ) => {
    if (!session) {
      toast.error('You must be logged in to upload transactions');
      return;
    }
    
    setLoading(true);
    try {
      const parseResult = parseCSV(csvString);
      
      let bankConnection: BankConnectionRow | undefined;
      if (bankConnectionId) {
        bankConnection = bankConnections.find(conn => conn.id === bankConnectionId);
      }
      
      const processCSVTransactions = async () => {
        const processedTransactions: Transaction[] = [];
        
        for (const transaction of parseResult.transactions) {
          if (bankConnectionId && bankConnection) {
            transaction.bankAccountId = bankConnectionId;
            transaction.bankAccountName = bankConnection.display_name || bankConnection.bank_name;
          }
          
          processedTransactions.push(transaction);
        }
        
        const transactionsWithBalance = calculateRunningBalance(processedTransactions, initialBalance, balanceDate);
        
        if (endBalance !== undefined && transactionsWithBalance.length > 0) {
          const lastTransaction = transactionsWithBalance[transactionsWithBalance.length - 1];
          const lastBalance = lastTransaction.balance || 0;
          const difference = Math.abs(lastBalance - endBalance);
          
          if (difference < 0.02) {
            toast.success('Bank statement successfully reconciled!');
          } else {
            toast.warning(
              `Ending balance (${endBalance.toFixed(2)}) doesn't match calculated balance (${lastBalance.toFixed(2)}). Difference: ${difference.toFixed(2)}`,
              {
                duration: 6000,
              }
            );
          }
        }
        
        try {
          const { transactions: savedTransactions } = await saveTransactionsToSupabase(
            transactionsWithBalance,
            session.user.id
          );
          
          setTransactions(prevTransactions => [...prevTransactions, ...savedTransactions]);
          toast.success(`Successfully processed ${savedTransactions.length} transactions`);
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          
        } catch (err: any) {
          console.error('Error saving transactions to Supabase:', err);
          toast.error('Failed to save transactions to database');
        }
      };
      
      await processCSVTransactions();
    } catch (error) {
      console.error('Error uploading CSV:', error);
      toast.error('Error processing CSV file');
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

  return {
    transactions,
    loading,
    aiAnalyzeLoading,
    addTransactions,
    updateTransaction,
    analyzeTransactionWithAI,
    uploadCSV,
    getFilteredTransactions,
    filterTransactionsByDate,
    fetchTransactionsForBankAccount,
    getBankConnectionById,
    setTransactions,
    fetchTransactions
  };
};
