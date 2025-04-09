
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Transaction, Category, FinancialSummary, Vendor } from '../types';
import { mockCategories } from '../data/mockData';
import { parseCSV } from '../utils/csvParser';
import { extractVendorName } from '../utils/vendorExtractor';
import { toast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { VendorCategorizationRow } from '@/types/supabase';

interface BookkeepingContextType {
  transactions: Transaction[];
  categories: Category[];
  vendors: Vendor[];
  financialSummary: FinancialSummary;
  loading: boolean;
  aiAnalyzeLoading: boolean;
  addTransactions: (newTransactions: Transaction[]) => void;
  updateTransaction: (updatedTransaction: Transaction) => void;
  verifyTransaction: (id: string, category: string, type: Transaction['type'], statementType: Transaction['statementType']) => void;
  verifyVendor: (vendorName: string, approved: boolean) => void;
  uploadCSV: (csvString: string) => void;
  getFilteredTransactions: (
    statementType?: Transaction['statementType'], 
    verified?: boolean,
    vendor?: string
  ) => Transaction[];
  getVendorsList: () => { name: string; count: number; verified: boolean; }[];
  calculateFinancialSummary: () => void;
  analyzeTransactionWithAI: (transaction: Transaction) => Promise<any>;
}

const initialFinancialSummary: FinancialSummary = {
  totalIncome: 0,
  totalExpenses: 0,
  totalAssets: 0,
  totalLiabilities: 0,
  totalEquity: 0,
  netProfit: 0,
};

const BookkeepingContext = createContext<BookkeepingContextType | undefined>(undefined);

export const BookkeepingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>(initialFinancialSummary);
  const [loading, setLoading] = useState<boolean>(false);
  const [aiAnalyzeLoading, setAiAnalyzeLoading] = useState<boolean>(false);

  // Load vendors from Supabase
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
          // Convert from database format to our app's format
          const vendorsFromDB: Vendor[] = data.map((v: VendorCategorizationRow) => ({
            name: v.vendor_name,
            category: v.category,
            type: v.type as Transaction['type'],
            statementType: v.statement_type as Transaction['statementType'],
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

  const calculateFinancialSummary = () => {
    const summary: FinancialSummary = {
      totalIncome: 0,
      totalExpenses: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      netProfit: 0,
    };

    transactions.forEach(transaction => {
      if (!transaction.isVerified) return;

      const amount = Math.abs(transaction.amount);
      
      switch(transaction.type) {
        case 'income':
          summary.totalIncome += amount;
          break;
        case 'expense':
          summary.totalExpenses += amount;
          break;
        case 'asset':
          summary.totalAssets += amount;
          break;
        case 'liability':
          summary.totalLiabilities += amount;
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
    // Process transactions to extract vendor names
    const processedTransactions = newTransactions.map(transaction => {
      const vendor = extractVendorName(transaction.description);
      return {
        ...transaction,
        vendor,
        vendorVerified: false
      };
    });
    
    // Update vendors database with new occurrences
    const updatedVendors = [...vendors];
    processedTransactions.forEach(transaction => {
      if (transaction.vendor && transaction.category) {
        const existingVendorIndex = updatedVendors.findIndex(v => v.name === transaction.vendor);
        
        if (existingVendorIndex >= 0) {
          // Update existing vendor occurrence count
          updatedVendors[existingVendorIndex].occurrences += 1;
        } else if (transaction.category && transaction.type && transaction.statementType) {
          // Add new vendor to database
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
      // Get category names to pass to the AI
      const categoryNames = categories.map(c => c.name);
      
      // Call our edge function to analyze the transaction
      const { data, error } = await supabase.functions.invoke('analyze-transaction', {
        body: { 
          description: transaction.description,
          amount: transaction.amount,
          existingCategories: categoryNames
        }
      });
      
      if (error) throw error;
      
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
          // Update transaction
          const updatedTransaction = { 
            ...transaction, 
            category, 
            type, 
            statementType, 
            isVerified: true 
          };
          
          // Update vendor database when a transaction is verified
          if (updatedTransaction.vendor && session) {
            const updateVendorInSupabase = async () => {
              const existingVendorIndex = vendors.findIndex(v => v.name === updatedTransaction.vendor);
              
              if (existingVendorIndex >= 0) {
                // Update existing vendor in Supabase
                const { error } = await supabase
                  .from('vendor_categorizations')
                  .update({
                    occurrences: vendors[existingVendorIndex].occurrences + 1,
                    last_used: new Date().toISOString()
                  })
                  .eq('vendor_name', updatedTransaction.vendor);
                  
                if (error) console.error('Error updating vendor in Supabase:', error);
                
                // Update local vendor state
                const updatedVendors = [...vendors];
                updatedVendors[existingVendorIndex].occurrences += 1;
                
                // Mark vendor as verified if it has occurred enough times
                if (updatedVendors[existingVendorIndex].occurrences >= 5) {
                  updatedVendors[existingVendorIndex].verified = true;
                  
                  // Update verified status in Supabase
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
                // Add new vendor to Supabase
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
                
                // Add to local state
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
      // Update in Supabase
      const { error } = await supabase
        .from('vendor_categorizations')
        .update({ verified: approved })
        .eq('vendor_name', vendorName);
        
      if (error) throw error;
      
      // Update local state
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

  const uploadCSV = async (csvString: string) => {
    setLoading(true);
    try {
      const parsedTransactions = parseCSV(csvString);
      
      // Process with AI for uncategorized transactions and extract vendor names
      const processTransactions = async () => {
        const processedTransactions = [];
        
        for (const transaction of parsedTransactions) {
          const vendor = extractVendorName(transaction.description);
          
          // Check if we have a verified vendor that matches
          const matchedVendor = vendors.find(v => 
            v.name === vendor && v.verified && v.occurrences >= 5
          );
          
          if (matchedVendor) {
            // Auto-categorize based on vendor history
            processedTransactions.push({
              ...transaction,
              vendor,
              vendorVerified: true,
              category: matchedVendor.category,
              type: matchedVendor.type,
              statementType: matchedVendor.statementType,
              isVerified: true
            });
          } else if (!transaction.category && session) {
            // Use AI for uncategorized transactions
            const aiResult = await analyzeTransactionWithAI(transaction);
            processedTransactions.push({
              ...transaction,
              vendor,
              vendorVerified: false,
              aiSuggestion: aiResult?.category
            });
          } else {
            processedTransactions.push({
              ...transaction,
              vendor,
              vendorVerified: false
            });
          }
        }
        
        addTransactions(processedTransactions);
        toast.success(`Successfully processed ${processedTransactions.length} transactions`);
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
  
  const getVendorsList = () => {
    // Get a list of all unique vendors with their transaction counts
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
    addTransactions,
    updateTransaction,
    verifyTransaction,
    verifyVendor,
    uploadCSV,
    getFilteredTransactions,
    getVendorsList,
    calculateFinancialSummary,
    analyzeTransactionWithAI,
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
