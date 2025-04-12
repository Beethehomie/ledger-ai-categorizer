import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Transaction, Category, FinancialSummary, Vendor, Currency } from '../types';
import { mockCategories } from '../data/mockData';
import { parseCSV } from '../utils/csvParser';
import { extractVendorName } from '../utils/vendorExtractor';
import { toast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { VendorCategorizationRow, BankConnectionRow } from '@/types/supabase';
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
          summary.cashBalance -= amount; // Assuming purchasing an asset reduces cash
          break;
        case 'liability':
          summary.totalLiabilities += amount;
          summary.cashBalance += amount; // Assuming taking on liability increases cash
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

  const addTransactions = (newTransactions: Transaction[]) => {
    const processedTransactions = newTransactions.map(transaction => {
      const vendor = extractVendorName(transaction.description);
      return {
        ...transaction,
        vendor,
        vendorVerified: false,
        confidenceScore: Math.random() * 0.5 + 0.5
      };
    });
    
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

  const updateTransaction = (updatedTransaction: Transaction) => {
    setTransactions(prev => 
      prev.map(transaction => 
        transaction.id === updatedTransaction.id ? updatedTransaction : transaction
      )
    );
    calculateFinancialSummary();
  };

  const analyzeTransactionWithAI = async (transaction: Transaction) => {
    if (!session) {
      toast.error('You must be logged in to use AI categorization');
      return null;
    }
    
    setAiAnalyzeLoading(true);
    
    try {
      const categoryNames = categories.map(c => c.name);
      
      const { data, error } = await supabase.functions.invoke('analyze-transaction', {
        body: { 
          description: transaction.description,
          amount: transaction.amount,
          existingCategories: categoryNames
        }
      });
      
      if (error) throw error;
      
      setTransactions(prev => 
        prev.map(t => {
          if (t.id === transaction.id && data) {
            return {
              ...t,
              aiSuggestion: data.category,
              confidenceScore: data.confidence
            };
          }
          return t;
        })
      );
      
      return data;
    } catch (err: any) {
      console.error('Error analyzing transaction with AI:', err);
      toast.error('Failed to analyze transaction with AI');
      return null;
    } finally {
      setAiAnalyzeLoading(false);
    }
  };

  const verifyTransaction = async (id: string, category: string, type: Transaction['type'], statementType: Transaction['statementType']) => {
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
        runningBalance -= Math.abs(transaction.amount);  // Purchasing an asset reduces cash
      } else if (transaction.type === 'liability') {
        runningBalance += Math.abs(transaction.amount);  // Taking on liability increases cash
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
    setLoading(true);
    try {
      const parsedTransactions = parseCSV(csvString);
      
      let bankConnection: BankConnectionRow | undefined;
      if (bankConnectionId) {
        bankConnection = bankConnections.find(conn => conn.id === bankConnectionId);
      }
      
      const processTransactions = async () => {
        const processedTransactions = [];
        
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
          } else if (!transaction.category && session) {
            const aiResult = await analyzeTransactionWithAI(transaction);
            processedTransactions.push({
              ...transaction,
              vendor,
              vendorVerified: false,
              aiSuggestion: aiResult?.category,
              confidenceScore
            });
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
