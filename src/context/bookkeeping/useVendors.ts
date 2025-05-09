import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { Vendor, Transaction, StatementType, VendorItem } from '@/types';
import { toast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { updateVendorInSupabase, removeDuplicateVendorsFromSupabase } from './vendorUtils';
import { VendorItem as VendorListItem } from './types';

export const useVendors = (
  transactions: Transaction[],
  updateTransaction: (transaction: Transaction) => void
) => {
  const { session } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

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
          const vendorsFromDB: Vendor[] = data.map((v) => {
            let statementType: StatementType = 'profit_loss';
            if (v.statement_type === 'balance_sheet') {
              statementType = 'balance_sheet';
            }
            
            return {
              name: v.vendor_name || '',
              category: v.category || '',
              type: (v.type as Transaction['type']) || 'expense',
              statementType: statementType,
              occurrences: v.occurrences || 1,
              verified: v.verified || false
            };
          });
          
          setVendors(vendorsFromDB);
        }
      } catch (err) {
        console.error('Error in fetchVendors:', err);
      }
    };
    
    fetchVendors();
  }, [session]);

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

  const verifyTransaction = async (
    id: string, 
    category: string, 
    type: Transaction['type'], 
    statementType: Transaction['statementType']
  ) => {
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
      
      const transaction = transactions.find(t => t.id === id);
      
      if (transaction && transaction.vendor) {
        const { updatedVendors } = await updateVendorInSupabase(
          transaction.vendor,
          category,
          type,
          statementType,
          vendors
        );
        
        if (updatedVendors) {
          setVendors(updatedVendors);
        }
      }
      
      const updatedTransaction = transactions.find(t => t.id === id);
      if (updatedTransaction) {
        updateTransaction({
          ...updatedTransaction,
          category,
          type,
          statementType,
          isVerified: true
        });
      }
      
      toast.success('Transaction verified');
      
    } catch (err: any) {
      console.error('Error verifying transaction in Supabase:', err);
      toast.error('Failed to verify transaction in database');
    }
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
      
      for (const transaction of matchingTransactions) {
        updateTransaction({
          ...transaction,
          category,
          type,
          statementType,
          isVerified: true
        });
      }
      
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
      
    } catch (err: any) {
      console.error('Error batch verifying transactions:', err);
      toast.error('Failed to verify transactions in batch');
    } finally {
      setLoading(false);
    }
  };

  const removeDuplicateVendors = async (): Promise<void> => {
    if (!session) {
      toast.error('You must be logged in to manage vendors');
      return;
    }

    try {
      setLoading(true);
      const { success, updatedVendors } = await removeDuplicateVendorsFromSupabase();
      
      if (success && updatedVendors) {
        setVendors(updatedVendors);
      }
    } catch (err) {
      console.error('Error in removeDuplicateVendors:', err);
    } finally {
      setLoading(false);
    }
  };

  const getVendorsList = (): VendorListItem[] => {
    const vendorSet = new Set(vendors.map(v => v.name));
    const vendorCounts: Record<string, { count: number; verified: boolean }> = {};
    
    vendors.forEach(vendor => {
      vendorCounts[vendor.name] = { 
        count: 0, 
        verified: vendor.verified 
      };
    });
    
    transactions.forEach(transaction => {
      if (transaction.vendor) {
        if (!vendorCounts[transaction.vendor]) {
          vendorCounts[transaction.vendor] = { 
            count: 1, 
            verified: false 
          };
          vendorSet.add(transaction.vendor);
        } else {
          vendorCounts[transaction.vendor].count += 1;
        }
      }
    });
    
    return Array.from(vendorSet)
      .map(name => ({
        name,
        count: vendorCounts[name]?.count || 0,
        verified: vendorCounts[name]?.verified || false
      }))
      .sort((a, b) => b.count - a.count);
  };

  const findSimilarTransactions = async (
    vendorName: string,
    allTransactions: Transaction[] = transactions
  ): Promise<Transaction[]> => {
    if (!session) {
      toast.error('You must be logged in to find similar transactions');
      return [];
    }
    
    try {
      const unverifiedTransactions = allTransactions.filter(t => 
        (!t.vendor || t.vendor === 'Unknown') && !t.isVerified
      );
      
      if (unverifiedTransactions.length === 0) {
        return [];
      }
      
      const vendorInfo = vendors.find(v => v.name === vendorName);
      if (!vendorInfo) {
        throw new Error(`Vendor ${vendorName} not found`);
      }
      
      const similarity = (a: string, b: string): number => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        
        if (aLower.includes(bLower) || bLower.includes(aLower)) {
          return 0.9;
        }
        
        const distanceMatrix: number[][] = Array(aLower.length + 1).fill(null).map(() => 
          Array(bLower.length + 1).fill(null)
        );
        
        for (let i = 0; i <= aLower.length; i++) {
          distanceMatrix[i][0] = i;
        }
        
        for (let j = 0; j <= bLower.length; j++) {
          distanceMatrix[0][j] = j;
        }
        
        for (let i = 1; i <= aLower.length; i++) {
          for (let j = 1; j <= bLower.length; j++) {
            const cost = aLower[i - 1] === bLower[j - 1] ? 0 : 1;
            distanceMatrix[i][j] = Math.min(
              distanceMatrix[i - 1][j] + 1,
              distanceMatrix[i][j - 1] + 1,
              distanceMatrix[i - 1][j - 1] + cost
            );
          }
        }
        
        const maxLength = Math.max(aLower.length, bLower.length);
        return maxLength === 0 ? 1 : 1 - distanceMatrix[aLower.length][bLower.length] / maxLength;
      };
      
      const similarTransactions: Transaction[] = [];
      
      for (const transaction of unverifiedTransactions) {
        const similarityScore = similarity(transaction.description, vendorName);
        
        if (similarityScore > 0.5) {
          const updatedTransaction = {
            ...transaction,
            vendor: vendorName,
            category: vendorInfo.category,
            type: vendorInfo.type,
            statementType: vendorInfo.statementType,
            confidenceScore: similarityScore
          };
          
          await updateTransaction(updatedTransaction);
          similarTransactions.push(updatedTransaction);
        }
      }
      
      return similarTransactions;
    } catch (err: any) {
      console.error('Error finding similar transactions:', err);
      toast.error('Failed to find similar transactions');
      return [];
    }
  };

  return {
    vendors,
    loading: loading,
    verifyVendor,
    verifyTransaction,
    batchVerifyVendorTransactions,
    removeDuplicateVendors,
    getVendorsList,
    findSimilarTransactions
  };
};
