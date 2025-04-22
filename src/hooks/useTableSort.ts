
import { useState } from 'react';
import { Transaction } from '@/types';

export const useTableSort = (initialSortField: string = 'date') => {
  const [sortField, setSortField] = useState<string>(initialSortField);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortTransactions = (transactions: Transaction[]) => {
    return [...transactions].sort((a, b) => {
      if (sortField === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortField === 'amount') {
        return sortDirection === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      } else if (sortField === 'description') {
        return sortDirection === 'asc'
          ? a.description.localeCompare(b.description)
          : b.description.localeCompare(a.description);
      } else if (sortField === 'vendor') {
        return sortDirection === 'asc'
          ? (a.vendor || '').localeCompare(b.vendor || '')
          : (b.vendor || '').localeCompare(a.vendor || '');
      }
      return 0;
    });
  };

  return {
    sortField,
    sortDirection,
    handleSort,
    sortTransactions
  };
};
