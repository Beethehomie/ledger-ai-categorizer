
import { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth';
import { toast } from '@/utils/toast';
import { detectColumns } from '@/utils/csvParser/detectColumns';
import { ParsedTransaction } from '@/utils/csvParser/types';
import { parseDate } from '@/utils/csvParser/dateParser';
import { parseAmount } from '@/utils/csvParser/amountParser';

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

  const uploadTransactions = async (bankConnectionId?: string): Promise<boolean> => {
    if (!session?.user?.id) {
      toast.error('You must be logged in to upload transactions');
      return false;
    }

    if (csvData.length < 2) {
      toast.error('No valid data found in the CSV');
      return false;
    }

    try {
      setIsUploading(true);

      const headers = csvData[0];
      const rows = csvData.slice(1).filter(row => row.length === headers.length);
      
      // Auto-detect columns
      const columnMapping = detectColumns(headers);
      
      if (!columnMapping.dateColumn || (!columnMapping.amountColumn && (!columnMapping.debitColumn || !columnMapping.creditColumn))) {
        toast.error('Could not detect required columns (date and amount)');
        return false;
      }

      // Process rows into transaction objects
      const transactions = rows.map(row => {
        const rowObj: Record<string, string> = {};
        headers.forEach((header, index) => {
          rowObj[header] = row[index];
        });

        const dateValue = rowObj[columnMapping.dateColumn!];
        const date = parseDate(dateValue);
        
        const description = columnMapping.descriptionColumn ? rowObj[columnMapping.descriptionColumn] : '';
        
        let amount = 0;
        if (columnMapping.amountColumn) {
          amount = parseAmount(rowObj[columnMapping.amountColumn]);
        } else if (columnMapping.debitColumn && columnMapping.creditColumn) {
          const debit = parseAmount(rowObj[columnMapping.debitColumn]);
          const credit = parseAmount(rowObj[columnMapping.creditColumn]);
          amount = credit - debit;
        }

        return {
          date: date,
          description: description,
          amount: amount,
          user_id: session.user.id,
          bank_connection_id: bankConnectionId
        };
      }).filter(tx => tx.date && tx.description);

      // Insert transactions into database
      // Use the .from method with proper table name instead of .insert
      const { data, error } = await supabase
        .from('bank_transactions')
        .insert(transactions);

      if (error) {
        console.error('Error uploading transactions:', error);
        toast.error('Failed to upload transactions');
        return false;
      }

      toast.success(`Successfully uploaded ${transactions.length} transactions`);
      return true;
    } catch (err) {
      console.error('Error in uploadTransactions:', err);
      toast.error('Failed to process CSV data');
      return false;
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
