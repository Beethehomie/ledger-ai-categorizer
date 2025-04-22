
import React from 'react';
import { TableHead } from '@/components/ui/table';
import { Column } from '@/types';

interface TableSortHeaderProps {
  column: Column;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
}

const TableSortHeader: React.FC<TableSortHeaderProps> = ({
  column,
  sortField,
  sortDirection,
  onSort
}) => {
  return (
    <TableHead 
      className="cursor-pointer" 
      onClick={() => onSort(column.id)}
    >
      {column.label} {sortField === column.id && (sortDirection === 'asc' ? '↑' : '↓')}
    </TableHead>
  );
};

export default TableSortHeader;
