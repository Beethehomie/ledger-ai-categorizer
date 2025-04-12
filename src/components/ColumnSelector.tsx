
import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Columns, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { TableColumn } from '@/types';

interface ColumnSelectorProps {
  columns: TableColumn[];
  onToggleColumn: (columnId: string, visible: boolean) => void;
  onSortColumn?: (columnId: string, direction: 'asc' | 'desc' | null) => void;
}

const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  columns,
  onToggleColumn,
  onSortColumn,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="ml-auto">
          <Columns className="h-4 w-4 mr-2" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => (
          <React.Fragment key={column.id}>
            {onSortColumn && column.sortable ? (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="justify-between">
                  <DropdownMenuCheckboxItem
                    checked={column.visible}
                    onCheckedChange={(checked) => onToggleColumn(column.id, checked)}
                    onSelect={(e) => e.preventDefault()}
                    className="p-0 hover:bg-transparent"
                  >
                    {column.name}
                  </DropdownMenuCheckboxItem>
                  <span className="flex items-center">
                    {column.sortDirection === 'asc' && <ArrowUp className="h-4 w-4 ml-2 text-primary" />}
                    {column.sortDirection === 'desc' && <ArrowDown className="h-4 w-4 ml-2 text-primary" />}
                    {!column.sortDirection && <ArrowUpDown className="h-4 w-4 ml-2 text-muted-foreground" />}
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="w-36">
                    <DropdownMenuItem onClick={() => onSortColumn(column.id, 'asc')}>
                      <ArrowUp className="h-4 w-4 mr-2" /> 
                      Sort Ascending
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSortColumn(column.id, 'desc')}>
                      <ArrowDown className="h-4 w-4 mr-2" /> 
                      Sort Descending
                    </DropdownMenuItem>
                    {column.sortDirection && (
                      <DropdownMenuItem onClick={() => onSortColumn(column.id, null)}>
                        Clear Sorting
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            ) : (
              <DropdownMenuCheckboxItem
                checked={column.visible}
                onCheckedChange={(checked) => onToggleColumn(column.id, checked)}
              >
                {column.name}
              </DropdownMenuCheckboxItem>
            )}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ColumnSelector;
