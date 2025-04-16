import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Transaction, Category, FinancialSummary, Vendor, Currency } from '../types';
import { mockCategories } from '../data/mockData';
import { parseCSV } from '../utils/csvParser';
import { extractVendorName } from '../utils/vendorExtractor';
import { toast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { VendorCategorizationRow, BankConnectionRow, BankTransactionRow } from '@/types/supabase';
import { useSettings } from './SettingsContext';

interface BookkeepingContextType {
  transactions: Transaction[];
  categories: Category[];
  vendors: Vendor[];
  financialSummary: FinancialSummary;
  loading: boolean;
  aiAnalyzeLoading: boolean;
  bankConnections: BankConnectionRow[];
  addTransactions: (newTransactions: Transaction[]) => void;
  updateTransaction: (updatedTransaction: Transaction) => void;
  verifyTransaction: (id: string, category: string, type: Transaction['type'], statementType: Transaction['statementType']) => void;
  verifyVendor: (vendorName: string, approved: boolean) => void;
  uploadCSV: (csvString: string, bankConnectionId?: string, initialBalance?: number) => void;
  getFilteredTransactions: (
    statementType?: Transaction['statementType'], 
    verified?: boolean,
    vendor?: string
  ) => Transaction[];
  filterTransactionsByDate: (
    startDate?: Date,
    endDate?: Date
  ) => Transaction[];
  getVendorsList: () => { name: string; count: number; verified: boolean; }[];
  calculateFinancialSummary: () => void;
  analyzeTransactionWithAI: (transaction: Transaction) => Promise<any>;
  getBankConnectionById: (id: string) => BankConnectionRow | undefined;
  removeDuplicateVendors: () => Promise<boolean>;
  fetchTransactionsForBankAccount: (bankAccountId: string) => Promise<Transaction[]>;
  batchVerifyVendorTransactions: (vendorName: string, category: string, type: Transaction['type'], statementType: Transaction['statementType']) => void;
}

const initialFinancialSummary: FinancialSummary = {
  totalIncome: 0,
  totalExpenses: 0,
  totalAssets: 0,
  totalLiabilities: 0,
  totalEquity: 0,
  netProfit: 0,
  cashBalance: 0,
};

const BookkeepingContext = createContext<BookkeepingContextType | undefined>(undefined);

export const BookkeepingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const { currency } = useSettings();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bankConnections, setBankConnections] = useState<BankConnectionRow[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>(initialFinancialSummary);
  const [loading, setLoading] = useState<boolean>(false);
  const [aiAnalyzeLoading, setAiAnalyzeLoading] = useState<boolean>(false);

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
          calculateFinancialSummary();
        }
      } catch (err) {
        console.error('Error in fetchTransactions:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransactions();
  }, [session, bankConnections]);

  useEffect(() => {
    if (!session) return;

    const fetchVendors = async () => {
      try {
        const { data, error } = await supabase
          .from('vendor_categorizations')
          .select('*');
          
        if (error) {
          console.error('Error fetching vendors:', error);
          return;
        }
        
        if (data) {
          const vendorsFromDB: Vendor[] = data.map((v) => ({
            name: v.vendor_name || '',
            category: v.category || '',
            type: (v.type as Transaction['type']) || 'expense',
            statementType: (v.statement_type as Transaction['statementType']) || 'operating',
            occurrences: v.occurrences || 1,
            verified: v.verified || false
          }));
          
          setVendors(vendorsFromDB);
        }
      } catch (err) {
        console.error('Error in fetchVendors:', err);
      }
    };
    
    fetchVendors();
  }, [session]);

  useEffect(() => {
    if (!session) return;

    const fetchBankConnections = async () => {
      try {
        const { data, error } = await supabase
          .from('bank_connections')
          .select('*')
          .order('bank_name', { ascending: true });
          
        if (error) {
          console.error('Error fetching bank connections:', error);
          return;
        }
        
        if (data) {
          const transformedData: BankConnectionRow[] = data.map(conn => ({
            ...conn,
            display_name: conn.display_name || conn.bank_name
          }));
          setBankConnections(transformedData);
        }
      } catch (err) {
        console.error('Error in fetchBankConnections:', err);
      }
    };
    
    fetchBankConnections();
  }, [session]);

  const calculateFinancialSummary = () => {
    const summary: FinancialSummary = {
      totalIncome: 0,
      totalExpenses: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      netProfit: 0,
      cashBalance: 0,
    };

    transactions.forEach(transaction => {
      if (!transaction.isVerified) return;

      const amount = Math.abs(transaction.amount);
      
      switch(transaction.type) {
        case 'income':
          summary.totalIncome += amount;
          summary.cashBalance += amount;
          break;
        case 'expense':
          summary.totalExpenses += amount;
          summary.cashBalance -= amount;
          break;
        case 'asset':
          summary.totalAssets += amount;
          summary.cashBalance -= amount;
          break;
        case 'liability':
          summary.totalLiabilities += amount;
          summary.cashBalance += amount;
          break;
        case 'equity':
          summary.totalEquity += amount;
          break;
      }
    });

    summary.netProfit = summary.totalIncome - summary.totalExpenses;
    
    setFinancialSummary(summary);
    return summary;
  };

  const addTransactions = async (newTransactions: Transaction[]) => {
    if (!session) {
      toast.error('You must be logged in to add transactions');
      return;
    }
    
    const processedTransactions = newTransactions.map(transaction => {
      const vendor = extractVendorName(transaction.description);
      return {
        ...transaction,
        vendor,
        vendorVerified: false,
        confidenceScore: Math.random() * 0.5 + 0.5
      };
    });
    
    try {
      const supabaseTransactions = processedTransactions.map(t => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        category: t.category || null,
        type: t.type || null,
        statement_type: t.statementType || null,
        is_verified: t.isVerified,
        vendor: t.vendor || null,
        vendor_verified: t.vendorVerified || false,
        confidence_score: t.confidenceScore || null,
        bank_connection_id: t.bankAccountId || null,
        balance: t.balance || null,
        user_id: session.user.id
      }));
      
      const { data, error } = await supabase
        .from('bank_transactions')
        .insert(supabaseTransactions)
        .select();
        
      if (error) {
        throw error;
      }
      
      if (data) {
        for (let i = 0; i < processedTransactions.length; i++) {
          if (data[i]) {
            processedTransactions[i].id = data[i].id;
          }
        }
      }
    } catch (err: any) {
      console.error('Error saving transactions to Supabase:', err);
      toast.error('Failed to save transactions to database');
    }
    
    const updatedVendors = [...vendors];
    processedTransactions.forEach(transaction => {
      if (transaction.vendor && transaction.category) {
        const existingVendorIndex = updatedVendors.findIndex(v => v.name === transaction.vendor);
        
        if (existingVendorIndex >= 0) {
          updatedVendors[existingVendorIndex].occurrences += 1;
        } else if (transaction.category && transaction.type && transaction.statementType) {
          updatedVendors.push({
            name: transaction.vendor,
            category: transaction.category,
            type: transaction.type,
            statementType: transaction.statementType,
            occurrences: 1,
            verified: false
          });
        }
      }
    });
    
    setVendors(updatedVendors);
    setTransactions(prev => [...prev, ...processedTransactions]);
    calculateFinancialSummary();
    toast.success(`Added ${processedTransactions.length} transactions`);
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
      calculateFinancialSummary();
      
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
      const categoryNames = categories.map(c => c.name);
      
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
        
        if (data.source === 'database_exact' && data.vendorName && data.confidence > 0.9) {
          const vendorName = data.vendorName;
          const matchingTransactions = transactions.filter(t => 
            t.vendor === vendorName && !t.isVerified && t.id !== transaction.id
          );
          
          if (matchingTransactions.length > 0) {
            toast.info(`Found ${matchingTransactions.length} more transactions from ${vendorName}. Would you like to categorize them the same way?`, {
              action: {
                label: 'Yes, categorize all',
                onClick: () => batchVerifyVendorTransactions(vendorName, data.category, data.type, data.statementType)
              },
              duration: 8000,
            });
          }
        }
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

  const verifyTransaction = async (id: string, category: string, type: Transaction['type'], statementType: Transaction['statementType']) => {
    if (!session) {
      toast.error('You must be logged in to verify transactions');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('bank_transactions')
        .update({
          category,
          type,
          statement_type: statementType,
          is_verified: true
        })
        .eq('id', id);
        
      if (error) {
        throw error;
      }
      
      setTransactions(prev => 
        prev.map(transaction => {
          if (transaction.id === id) { 
            const updatedTransaction = { 
              ...transaction, 
              category, 
              type, 
              statementType, 
              isVerified: true 
            };
            
            if (updatedTransaction.vendor && session) {
              const updateVendorInSupabase = async () => {
                const existingVendorIndex = vendors.findIndex(v => v.name === updatedTransaction.vendor);
                
                if (existingVendorIndex >= 0) {
                  const { error } = await supabase
                    .from('vendor_categorizations')
                    .update({
                      occurrences: vendors[existingVendorIndex].occurrences + 1,
                      last_used: new Date().toISOString()
                    })
                    .eq('vendor_name', updatedTransaction.vendor);
                    
                  if (error) console.error('Error updating vendor in Supabase:', error);
                  
                  const updatedVendors = [...vendors];
                  updatedVendors[existingVendorIndex].occurrences += 1;
                  
                  if (updatedVendors[existingVendorIndex].occurrences >= 5) {
                    updatedVendors[existingVendorIndex].verified = true;
                    
                    supabase
                      .from('vendor_categorizations')
                      .update({ verified: true })
                      .eq('vendor_name', updatedTransaction.vendor)
                      .then(({ error }) => {
                        if (error) console.error('Error updating vendor verified status:', error);
                      });
                  }
                  
                  setVendors(updatedVendors);
                } else {
                  const { error } = await supabase
                    .from('vendor_categorizations')
                    .insert({
                      vendor_name: updatedTransaction.vendor,
                      category,
                      type,
                      statement_type: statementType,
                      occurrences: 1,
                      verified: false
                    });
                    
                  if (error) console.error('Error adding vendor to Supabase:', error);
                  
                  setVendors([...vendors, {
                    name: updatedTransaction.vendor,
                    category,
                    type,
                    statementType,
                    occurrences: 1,
                    verified: false
                  }]);
                }
              };
              
              updateVendorInSupabase().catch(console.error);
            }
            
            return updatedTransaction;
          }
          return transaction;
        })
      );
      calculateFinancialSummary();
      toast.success('Transaction verified');
      
    } catch (err: any) {
      console.error('Error verifying transaction in Supabase:', err);
      toast.error('Failed to verify transaction in database');
    }
  };
  
  const verifyVendor = async (vendorName: string, approved: boolean) => {
    if (!session) {
      toast.error('You must be logged in to verify vendors');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('vendor_categorizations')
        .update({ verified: approved })
        .eq('vendor_name', vendorName);
        
      if (error) throw error;
      
      const updatedVendors = vendors.map(vendor => 
        vendor.name === vendorName ? { ...vendor, verified: approved } : vendor
      );
      
      setVendors(updatedVendors);
      toast.success(`Vendor ${approved ? 'approved' : 'rejected'}`);
    } catch (err: any) {
      console.error('Error verifying vendor:', err);
      toast.error('Failed to update vendor status');
    }
  };

  const calculateRunningBalance = (
    parsedTransactions: Transaction[], 
    initialBalance: number
  ): Transaction[] => {
    const sortedTransactions = [...parsedTransactions].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });
    
    let runningBalance = initialBalance;
    
    return sortedTransactions.map(transaction => {
      if (transaction.type === 'income') {
        runningBalance += transaction.amount;
      } else if (transaction.type === 'expense') {
        runningBalance -= Math.abs(transaction.amount);
      } else if (transaction.type === 'asset') {
        runningBalance -= Math.abs(transaction.amount);
      } else if (transaction.type === 'liability') {
        runningBalance += Math.abs(transaction.amount);
      }
      
      return {
        ...transaction,
        balance: Number(runningBalance.toFixed(2))
      };
    });
  };

  const removeDuplicateVendors = async (): Promise<boolean> => {
    if (!session) {
      toast.error('You must be logged in to manage vendors');
      return false;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('vendor_categorizations')
        .select('vendor_name, category');
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast.info('No vendors found to check for duplicates');
        return false;
      }
      
      const vendorMap = new Map<string, string[]>();
      data.forEach(v => {
        const name = v.vendor_name.toLowerCase().trim();
        const category = v.category;
        
        if (!vendorMap.has(name)) {
          vendorMap.set(name, [category]);
        } else {
          const categories = vendorMap.get(name) || [];
          if (!categories.includes(category)) {
            categories.push(category);
          }
          vendorMap.set(name, categories);
        }
      });
      
      const duplicates = [...vendorMap.entries()]
        .filter(([_, categories]) => categories.length > 1);
      
      if (duplicates.length === 0) {
        toast.success('No duplicate vendors found');
        return true;
      }
      
      let removedCount = 0;
      
      for (const [name, _] of duplicates) {
        const { data: vendorRecords } = await supabase
          .from('vendor_categorizations')
          .select('*')
          .ilike('vendor_name', name);
          
        if (!vendorRecords || vendorRecords.length <= 1) continue;
        
        const sorted = [...vendorRecords].sort((a, b) => {
          if (a.verified && !b.verified) return -1;
          if (!a.verified && b.verified) return 1;
          
          return (b.occurrences || 0) - (a.occurrences || 0);
        });
        
        const keepId = sorted[0].id;
        const toDelete = sorted.slice(1).map(v => v.id);
        
        if (toDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('vendor_categorizations')
            .delete()
            .in('id', toDelete);
            
          if (!deleteError) {
            removedCount += toDelete.length;
          }
        }
      }
      
      const { data: updatedVendors } = await supabase
        .from('vendor_categorizations')
        .select('*');
        
      if (updatedVendors) {
        const vendorsFromDB: Vendor[] = updatedVendors.map((v) => ({
          name: v.vendor_name || '',
          category: v.category || '',
          type: (v.type as Transaction['type']) || 'expense',
          statementType: (v.statement_type as Transaction['statementType']) || 'operating',
          occurrences: v.occurrences || 1,
          verified: v.verified || false
        }));
        
        setVendors(vendorsFromDB);
      }
      
      toast.success(`Removed ${removedCount} duplicate vendor entries`);
      return true;
    } catch (err: any) {
      console.error('Error removing duplicate vendors:', err);
      toast.error('Failed to remove duplicate vendors');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const uploadCSV = async (csvString: string, bankConnectionId?: string, initialBalance: number = 0) => {
    if (!session) {
      toast.error('You must be logged in to upload transactions');
      return;
    }
    
    setLoading(true);
    try {
      const parsedTransactions = parseCSV(csvString);
      
      let bankConnection: BankConnectionRow | undefined;
      if (bankConnectionId) {
        bankConnection = bankConnections.find(conn => conn.id === bankConnectionId);
      }
      
      const processTransactions = async () => {
        const processedTransactions: Transaction[] = [];
        
        for (const transaction of parsedTransactions) {
          const vendor = extractVendorName(transaction.description);
          const confidenceScore = Math.random() * 0.5 + 0.5;
          
          if (bankConnectionId && bankConnection) {
            transaction.bankAccountId = bankConnectionId;
            transaction.bankAccountName = bankConnection.display_name || bankConnection.bank_name;
          }
          
          const matchedVendor = vendors.find(v => 
            v.name === vendor && v.verified && v.occurrences >= 5
          );
          
          if (matchedVendor) {
            processedTransactions.push({
              ...transaction,
              vendor,
              vendorVerified: true,
              category: matchedVendor.category,
              type: matchedVendor.type,
              statementType: matchedVendor.statementType,
              isVerified: true,
              confidenceScore: 1.0
            });
          } else if (!transaction.category) {
            try {
              const aiResult = await analyzeTransactionWithAI(transaction);
              processedTransactions.push({
                ...transaction,
                vendor,
                vendorVerified: false,
                aiSuggestion: aiResult?.category,
                confidenceScore
              });
            } catch (error) {
              console.error('Error analyzing transaction with AI:', error);
              processedTransactions.push({
                ...transaction,
                vendor,
                vendorVerified: false,
                confidenceScore
              });
            }
          } else {
            processedTransactions.push({
              ...transaction,
              vendor,
              vendorVerified: false,
              confidenceScore
            });
          }
        }
        
        const transactionsWithBalance = calculateRunningBalance(processedTransactions, initialBalance);
        
        try {
          const supabaseTransactions = transactionsWithBalance.map(t => ({
            date: t.date,
            description: t.description,
            amount: t.amount,
            category: t.category || null,
            type: t.type || null,
            statement_type: t.statementType || null,
            is_verified: t.isVerified,
            vendor: t.vendor || null,
            vendor_verified: t.vendorVerified || false,
            confidence_score: t.confidenceScore || null,
            bank_connection_id: t.bankAccountId || null,
            balance: t.balance || null,
            user_id: session.user.id
          }));
          
          const { data, error } = await supabase
            .from('bank_transactions')
            .insert(supabaseTransactions)
            .select();
            
          if (error) {
            throw error;
          }
          
          if (data) {
            for (let i = 0; i < transactionsWithBalance.length; i++) {
              if (data[i]) {
                transactionsWithBalance[i].id = data[i].id;
              }
            }
          }
        } catch (err: any) {
          console.error('Error saving transactions to Supabase:', err);
          toast.error('Failed to save transactions to database');
        }
        
        addTransactions(transactionsWithBalance);
        toast.success(`Successfully processed ${transactionsWithBalance.length} transactions`);
      };
      
      await processTransactions();
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
  
  const getVendorsList = () => {
    const vendorCounts: Record<string, { count: number; verified: boolean }> = {};
    
    transactions.forEach(transaction => {
      if (transaction.vendor) {
        if (!vendorCounts[transaction.vendor]) {
          const vendorInfo = vendors.find(v => v.name === transaction.vendor);
          vendorCounts[transaction.vendor] = { 
            count: 1, 
            verified: vendorInfo?.verified || false 
          };
        } else {
          vendorCounts[transaction.vendor].count += 1;
        }
      }
    });
    
    return Object.entries(vendorCounts)
      .map(([name, { count, verified }]) => ({ name, count, verified }))
      .sort((a, b) => b.count - a.count);
  };

  const getBankConnectionById = (id: string) => {
    return bankConnections.find(conn => conn.id === id);
  };

  const batchVerifyVendorTransactions = async (
    vendorName: string, 
    category: string, 
    type: Transaction['type'], 
    statementType: Transaction['statementType']
  ) => {
    if (!session) return;
    
    try {
      const matchingTransactions = transactions.filter(t => 
        t.vendor === vendorName && !t.isVerified
      );
      
      if (matchingTransactions.length === 0) return;
      
      setLoading(true);
      
      const transactionIds = matchingTransactions.map(t => t.id);
      
      const { error } = await supabase
        .from('bank_transactions')
        .update({
          category,
          type,
          statement_type: statementType,
          is_verified: true
        })
        .in('id', transactionIds);
        
      if (error) throw error;
      
      setTransactions(prev => 
        prev.map(transaction => {
          if (transaction.vendor === vendorName && !transaction.isVerified) { 
            return { 
              ...transaction, 
              category, 
              type, 
              statementType, 
              isVerified: true 
            };
          }
          return transaction;
        })
      );
      
      const existingVendorIndex = vendors.findIndex(v => v.name === vendorName);
      
      if (existingVendorIndex >= 0) {
        const newOccurrences = vendors[existingVendorIndex].occurrences + matchingTransactions.length;
        
        const { error: vendorError } = await supabase
          .from('vendor_categorizations')
          .update({
            occurrences: newOccurrences,
            last_used: new Date().toISOString(),
            verified: newOccurrences >= 5
          })
          .eq('vendor_name', vendorName);
          
        if (!vendorError) {
          const updatedVendors = [...vendors];
          updatedVendors[existingVendorIndex] = {
            ...vendors[existingVendorIndex],
            occurrences: newOccurrences,
            verified: newOccurrences >= 5
          };
          setVendors(updatedVendors);
        }
      }
      
      toast.success(`Verified ${matchingTransactions.length} transactions from ${vendorName}`);
      calculateFinancialSummary();
      
    } catch (err: any) {
      console.error('Error batch verifying transactions:', err);
      toast.error('Failed to verify transactions in batch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateFinancialSummary();
  }, [transactions]);

  const value = {
    transactions,
    categories,
    vendors,
    financialSummary,
    loading,
    aiAnalyzeLoading,
    bankConnections,
    addTransactions,
    updateTransaction,
    verifyTransaction,
    verifyVendor,
    uploadCSV,
    getFilteredTransactions,
    filterTransactionsByDate,
    getVendorsList,
    calculateFinancialSummary,
    analyzeTransactionWithAI,
    getBankConnectionById,
    removeDuplicateVendors,
    fetchTransactionsForBankAccount,
    batchVerifyVendorTransactions,
  };

  return (
    <BookkeepingContext.Provider value={value}>
      {children}
    </BookkeepingContext.Provider>
  );
};

export const useBookkeeping = () => {
  const context = useContext(BookkeepingContext);
  if (context === undefined) {
    throw new Error('useBookkeeping must be used within a BookkeepingProvider');
  }
  return context;
};
