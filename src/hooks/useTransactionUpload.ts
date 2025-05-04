
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Transaction } from '@/types';
import { toast } from '@/utils/toast';

export const useTransactionUpload = () => {
  const [isLoading, setIsLoading] = useState(false);

  const uploadTransactions = async (transactions: Transaction[]) => {
    setIsLoading(true);

    try {
      // Format transactions for database insertion
      const formattedTransactions = transactions.map(transaction => ({
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
        user_id: supabase.auth.getUser().then(({ data }) => data.user?.id)
      }));

      // Insert transactions in batches of 50
      const batchSize = 50;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < formattedTransactions.length; i += batchSize) {
        const batch = formattedTransactions.slice(i, i + batchSize);
        
        const { data, error } = await supabase
          .from('transactions')
          .insert(batch)
          .select();

        if (error) {
          console.error('Error uploading batch:', error);
          errorCount += batch.length;
        } else {
          successCount += data.length;
        }
      }

      // If we have successful uploads, trigger the categorization process
      if (successCount > 0) {
        // Trigger batch categorization process
        await supabase.functions.invoke('categorize-transaction', {
          body: { batchProcess: true }
        });

        // Generate embeddings for the newly added transactions
        await supabase.functions.invoke('generate-transaction-embeddings', {
          body: { tableName: 'transactions', limit: 100 }
        });
      }

      // Return results
      return {
        success: successCount > 0,
        count: successCount,
        errors: errorCount
      };
    } catch (error) {
      console.error('Error in uploadTransactions:', error);
      return {
        success: false,
        count: 0,
        errors: 1
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    uploadTransactions,
    isLoading
  };
};
