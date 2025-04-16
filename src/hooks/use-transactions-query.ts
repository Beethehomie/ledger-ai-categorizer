
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transaction } from '@/types';
import { toast } from '@/utils/toast';

export const useTransactionsQuery = (
  startDate?: Date,
  endDate?: Date,
  bankConnectionId?: string
) => {
  return useQuery({
    queryKey: ['transactions', startDate?.toISOString(), endDate?.toISOString(), bankConnectionId],
    queryFn: async () => {
      let query = supabase
        .from('bank_transactions')
        .select('*')
        .order('date', { ascending: false });

      if (startDate) {
        query = query.gte('date', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('date', endDate.toISOString());
      }
      if (bankConnectionId) {
        query = query.eq('bank_connection_id', bankConnectionId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching transactions:', error);
        toast.error('Failed to fetch transactions');
        return [];
      }

      return data?.map((t) => ({
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
      })) || [];
    },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep unused data in cache for 30 minutes
  });
};

// Hook for vendor categorizations
export const useVendorCategorizationsQuery = () => {
  return useQuery({
    queryKey: ['vendor-categorizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_categorizations')
        .select('*')
        .order('last_used', { ascending: false });

      if (error) {
        console.error('Error fetching vendor categorizations:', error);
        toast.error('Failed to fetch vendor categorizations');
        return [];
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 15, // Consider data fresh for 15 minutes
    gcTime: 1000 * 60 * 60, // Keep unused data in cache for 1 hour
  });
};
