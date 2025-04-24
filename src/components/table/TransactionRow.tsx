import React, { useState } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Store, Building, AlertCircle, Edit, Loader2, Check, Trash2 } from 'lucide-react';
import { Transaction } from '@/types';
import { Currency } from '@/types';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/utils/currencyUtils';
import { toast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/utils/errorLogger';
import { useAuth } from '@/hooks/auth';
import { BusinessContext } from '@/types/supabase';

interface TransactionRowProps {
  transaction: Transaction;
  currency: Currency;
  tableColumns: { id: string; visible: boolean }[];
  uniqueVendors: string[];
  onVendorChange: (transaction: Transaction, vendorName: string) => void;
  getBankName: (transaction: Transaction) => string;
  renderConfidenceScore?: (score?: number) => React.ReactNode;
  isSelected?: boolean;
  onSelectChange?: (transactionId: string, isSelected: boolean) => void;
}

const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  currency,
  tableColumns,
  uniqueVendors,
  onVendorChange,
  getBankName,
  renderConfidenceScore,
  isSelected = false,
  onSelectChange
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { session } = useAuth();
  
  const handleVendorSelect = async (value: string) => {
    if (value === "extract") {
      setIsAnalyzing(true);
      try {
        let businessContext: BusinessContext = {};
        let country = "ZA";
        
        if (session?.user) {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('business_context')
            .eq('id', session.user.id)
            .single();
            
          if (!error && data && data.business_context) {
            const contextData = data.business_context as BusinessContext;
            businessContext = contextData;
            country = contextData.country || "ZA";
          }
        }
        
        const { data, error } = await supabase.functions.invoke('analyze-transaction-vendor', {
          body: { 
            description: transaction.description,
            existingVendors: uniqueVendors,
            country: country,
            context: businessContext
          }
        });
        
        if (error) {
          throw error;
        }
        
        if (!data || !data.vendor) {
          throw new Error('No vendor data returned from analysis');
        }
        
        const vendorName = data.vendor;
        const updatedTransaction = { ...transaction, vendor: vendorName };
        
        if (!data.isExisting && data.category) {
          updatedTransaction.category = data.category;
          updatedTransaction.confidenceScore = data.confidence;
          updatedTransaction.type = data.type;
          updatedTransaction.statementType = data.statementType;
          
          toast.success(`Vendor extracted: ${vendorName} (Category: ${data.category})`);
        } else {
          toast.success(`Vendor extracted: ${vendorName}`);
        }
        
        onVendorChange(updatedTransaction, vendorName);
      } catch (err) {
        logError("TransactionRow.extractVendor", err);
        toast.error("Failed to extract vendor from description. Please try again or select a vendor manually.");
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      onVendorChange(transaction, value);
    }
  };

  const handleSelectChange = (checked: boolean) => {
    if (onSelectChange) {
      onSelectChange(transaction.id, checked);
    }
  };

  return (
    <TableRow className={cn(
      transaction.isVerified ? "" : "bg-muted/30",
      transaction.type === 'income' || transaction.amount > 0 ? "border-l-2 border-l-finance-green" : "",
      transaction.type === 'expense' && transaction.amount < 0 ? "border-l-2 border-l-finance-red" : "",
      transaction.confidenceScore !== undefined && transaction.confidenceScore < 0.5 ? "border-l-2 border-l-amber-500" : "",
      isSelected ? "bg-muted/50" : "",
      "transition-all hover:bg-muted/30"
    )}>
      {onSelectChange && (
        <TableCell className="w-10">
          <Checkbox 
            checked={isSelected} 
            onCheckedChange={handleSelectChange} 
            aria-label="Select transaction"
          />
        </TableCell>
      )}
      
      {tableColumns.find(col => col.id === 'date')?.visible && (
        <TableCell>{formatDate(transaction.date, currency)}</TableCell>
      )}
      
      {tableColumns.find(col => col.id === 'description')?.visible && (
        <TableCell>{transaction.description}</TableCell>
      )}
      
      {tableColumns.find(col => col.id === 'vendor')?.visible && (
        <TableCell className="max-w-[200px]">
          <div className="flex items-center gap-2">
            <Select
              value={transaction.vendor || "Unknown"}
              onValueChange={handleVendorSelect}
              disabled={isAnalyzing}
            >
              <SelectTrigger className="h-8 w-full border-0 bg-transparent hover:bg-muted/50 focus:ring-0 pl-0 truncate">
                <div className="flex items-center">
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 text-finance-gray shrink-0 mr-2 animate-spin" />
                  ) : (
                    <Store className="h-4 w-4 text-finance-gray shrink-0 mr-2" />
                  )}
                  <span className="truncate">{transaction.vendor || "Unknown"}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Unknown">
                  <div className="flex items-center">
                    <AlertCircle className="h-3.5 w-3.5 mr-1 text-amber-500" />
                    <span>Unknown</span>
                  </div>
                </SelectItem>
                
                <SelectItem value="extract">
                  <div className="flex items-center">
                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                    <span>Extract vendor from description</span>
                  </div>
                </SelectItem>
                
                {uniqueVendors
                  .filter(vendor => vendor !== "Unknown")
                  .sort()
                  .map(vendor => (
                    <SelectItem key={vendor} value={vendor}>
                      <div className="flex items-center">
                        <Store className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                        {vendor}
                      </div>
                    </SelectItem>
                ))}
                <SelectItem value="add-new">
                  <div className="flex items-center">
                    <Edit className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    <span>Add new vendor...</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TableCell>
      )}
      
      {tableColumns.find(col => col.id === 'amount')?.visible && (
        <TableCell 
          className={cn(
            "text-right font-medium",
            transaction.amount > 0 ? "text-finance-green" : "text-finance-red"
          )}
        >
          {formatCurrency(transaction.amount, currency)}
        </TableCell>
      )}
      
      {tableColumns.find(col => col.id === 'bankAccount')?.visible && (
        <TableCell>
          <div className="flex items-center gap-1">
            <Building className="h-4 w-4 text-finance-gray" />
            <span>{getBankName(transaction)}</span>
          </div>
        </TableCell>
      )}
      
      {tableColumns.find(col => col.id === 'balance')?.visible && (
        <TableCell className="text-right font-medium">
          {transaction.balance !== undefined ? 
            formatCurrency(transaction.balance, currency) : 
            '-'}
        </TableCell>
      )}
      
      {tableColumns.find(col => col.id === 'confidence')?.visible && (
        <TableCell>
          {renderConfidenceScore && renderConfidenceScore(transaction.confidenceScore)}
        </TableCell>
      )}
    </TableRow>
  );
};

export default TransactionRow;
