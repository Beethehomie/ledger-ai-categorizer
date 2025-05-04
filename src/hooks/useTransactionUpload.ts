
import { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth';
import { toast } from '@/utils/toast';
import { detectColumns } from '@/utils/csvParser/detectColumns';
import { ParsedTransaction } from '@/utils/csvParser/types';
import { parseDate } from '@/utils/csvParser/dateParser';
import { parseAmount } from '@/utils/csvParser/amountParser';
import { Transaction } from '@/types';

export const useTransactionUpload = () => {
  const { session } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [fileName, setFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const parseCSV = (file: File): Promise<string[][]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: (results) => {
          const data = results.data as string[][];
          resolve(data);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  };

  const uploadTransactions = async (transactions: Transaction[]): Promise<{ success: boolean; count: number }> => {
    if (!session?.user?.id) {
      toast.error('You must be logged in to upload transactions');
      return { success: false, count: 0 };
    }

    if (!transactions || transactions.length === 0) {
      toast.error('No valid data found to upload');
      return { success: false, count: 0 };
    }

    try {
      setIsUploading(true);

      // Format transactions for database insertion
      const formattedTransactions = transactions.map(tx => ({
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        user_id: session.user.id,
        bank_connection_id: tx.bankAccountId // Changed from bankConnectionId to bankAccountId to match the Transaction type
      }));

      // Insert transactions into database
      const { error } = await supabase
        .from('bank_transactions')
        .insert(formattedTransactions);

      if (error) {
        console.error('Error uploading transactions:', error);
        toast.error('Failed to upload transactions');
        return { success: false, count: 0 };
      }

      return { success: true, count: transactions.length };
    } catch (err) {
      console.error('Error in uploadTransactions:', err);
      toast.error('Failed to process CSV data');
      return { success: false, count: 0 };
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (file: File): Promise<void> => {
    try {
      setFileName(file.name);
      setErrorMessage('');
      
      const data = await parseCSV(file);
      
      if (data.length < 2) {
        setErrorMessage('CSV file is empty or has no data rows');
        return;
      }
      
      setCsvData(data);
    } catch (err) {
      console.error('Error parsing CSV:', err);
      setErrorMessage('Failed to parse CSV file');
      toast.error('Failed to parse CSV file');
    }
  };

  const resetUpload = () => {
    setCsvData([]);
    setFileName('');
    setErrorMessage('');
  };

  return {
    isUploading,
    csvData,
    fileName,
    errorMessage,
    handleFileUpload,
    uploadTransactions,
    resetUpload
  };
};
