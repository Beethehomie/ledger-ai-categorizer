
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Transaction, Category, FinancialSummary, Vendor } from '../types';
import { mockTransactions, mockCategories } from '../data/mockData';
import { parseCSV, categorizeByCriteria, analyzeTransactionWithAI } from '../utils/csvParser';
import { extractVendorName } from '../utils/vendorExtractor';
import { toast } from '@/utils/toast';

interface BookkeepingContextType {
  transactions: Transaction[];
  categories: Category[];
  vendors: Vendor[];
  financialSummary: FinancialSummary;
  loading: boolean;
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
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    // Add vendor names to existing mock transactions
    return mockTransactions.map(t => ({
      ...t,
      vendor: extractVendorName(t.description),
      vendorVerified: false
    }));
  });
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>(initialFinancialSummary);
  const [loading, setLoading] = useState<boolean>(false);

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

  const verifyTransaction = (id: string, category: string, type: Transaction['type'], statementType: Transaction['statementType']) => {
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
          if (updatedTransaction.vendor) {
            const existingVendorIndex = vendors.findIndex(v => v.name === updatedTransaction.vendor);
            
            if (existingVendorIndex >= 0) {
              // Update existing vendor
              const updatedVendors = [...vendors];
              updatedVendors[existingVendorIndex].occurrences += 1;
              
              // Mark vendor as verified if it has occurred enough times
              if (updatedVendors[existingVendorIndex].occurrences >= 5) {
                updatedVendors[existingVendorIndex].verified = true;
              }
              
              setVendors(updatedVendors);
            } else {
              // Add new vendor to database
              setVendors([...vendors, {
                name: updatedTransaction.vendor,
                category,
                type,
                statementType,
                occurrences: 1,
                verified: false
              }]);
            }
          }
          
          return updatedTransaction;
        }
        return transaction;
      })
    );
    calculateFinancialSummary();
    toast.success('Transaction verified');
  };
  
  const verifyVendor = (vendorName: string, approved: boolean) => {
    const updatedVendors = vendors.map(vendor => 
      vendor.name === vendorName ? { ...vendor, verified: approved } : vendor
    );
    
    setVendors(updatedVendors);
    toast.success(`Vendor ${approved ? 'approved' : 'rejected'}`);
  };

  const uploadCSV = (csvString: string) => {
    setLoading(true);
    try {
      const parsedTransactions = parseCSV(csvString);
      
      // Process with AI for uncategorized transactions and extract vendor names
      const processedTransactions = parsedTransactions.map(transaction => {
        const vendor = extractVendorName(transaction.description);
        
        // Check if we have a verified vendor that matches
        const matchedVendor = vendors.find(v => 
          v.name === vendor && v.verified && v.occurrences >= 5
        );
        
        if (matchedVendor) {
          // Auto-categorize based on vendor history
          return {
            ...transaction,
            vendor,
            vendorVerified: true,
            category: matchedVendor.category,
            type: matchedVendor.type,
            statementType: matchedVendor.statementType,
            isVerified: true
          };
        } else if (!transaction.category) {
          // Use AI for uncategorized transactions
          const aiResult = analyzeTransactionWithAI(transaction);
          return {
            ...transaction,
            vendor,
            vendorVerified: false,
            aiSuggestion: aiResult.aiSuggestion
          };
        }
        
        return {
          ...transaction,
          vendor,
          vendorVerified: false
        };
      });
      
      addTransactions(processedTransactions);
      toast.success(`Successfully processed ${processedTransactions.length} transactions`);
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

  React.useEffect(() => {
    calculateFinancialSummary();
  }, []);

  const value = {
    transactions,
    categories,
    vendors,
    financialSummary,
    loading,
    addTransactions,
    updateTransaction,
    verifyTransaction,
    verifyVendor,
    uploadCSV,
    getFilteredTransactions,
    getVendorsList,
    calculateFinancialSummary,
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
