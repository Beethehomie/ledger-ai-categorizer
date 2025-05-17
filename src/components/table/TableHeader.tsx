
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Download,
  RefreshCw,
  Scale,
  Plus,
  ArrowUpDown,
  MoreHorizontal,
  Store
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from '@/utils/toast';
import { Column } from '@/components/table/ColumnSelector';
import { cn } from "@/lib/utils";
import ColumnSelector from './ColumnSelector';

interface TableHeaderProps {
  filter?: string;
  vendorName?: string;
  isAccountReconciled?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
  onUpload?: () => void;
  onReconcile?: () => void;
  onAddVendor?: () => void;
  onToggleColumn: (columnId: string) => void;
  columns: Column[];
}

const TableHeaderComponent: React.FC<TableHeaderProps> = ({
  filter,
  vendorName,
  isAccountReconciled,
  onRefresh,
  onExport,
  onUpload,
  onReconcile,
  onAddVendor,
  onToggleColumn,
  columns
}) => {
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  
  let title = 'All Transactions';
  if (filter === 'unverified') title = 'Unverified Transactions';
  else if (filter === 'profit_loss') title = 'Profit & Loss Transactions';
  else if (filter === 'balance_sheet') title = 'Balance Sheet Transactions';
  else if (filter === 'by_vendor' && vendorName) title = `${vendorName} Transactions`;
  else if (filter === 'review') title = 'Transactions Needing Review';
  
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
      <div className="flex items-center">
        <h2 className="text-lg font-semibold">{title}</h2>
        {isAccountReconciled && (
          <div className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            Reconciled
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {filter === 'by_vendor' && onAddVendor && (
          <Button
            size="sm"
            variant="outline"
            onClick={onAddVendor}
            className="hidden sm:flex"
          >
            <Store className="h-4 w-4 mr-1" />
            Edit Vendor
          </Button>
        )}
        
        {onReconcile && (
          <Button
            size="sm" 
            variant="outline"
            onClick={onReconcile}
            className="hidden sm:flex"
          >
            <Scale className="h-4 w-4 mr-1" />
            Reconcile
          </Button>
        )}
        
        {onExport && (
          <Button
            size="sm" 
            variant="outline"
            onClick={onExport}
            className="hidden sm:flex"
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        )}
        
        {onRefresh && (
          <Button
            size="sm" 
            variant="outline"
            onClick={onRefresh}
            className="hidden sm:flex"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        )}
        
        <Popover open={isColumnSelectorOpen} onOpenChange={setIsColumnSelectorOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm" 
              variant="outline"
              className="hidden sm:flex"
            >
              <ArrowUpDown className="h-4 w-4 mr-1" />
              Columns
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="end" className="w-[200px] p-0">
            <ColumnSelector columns={columns} onToggle={onToggleColumn} />
          </PopoverContent>
        </Popover>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="sm:hidden"
            >
              <MoreHorizontal className="h-4 w-4" />
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {filter === 'by_vendor' && onAddVendor && (
              <DropdownMenuItem onClick={onAddVendor}>
                <Store className="h-4 w-4 mr-2" />
                Edit Vendor
              </DropdownMenuItem>
            )}
            
            {onReconcile && (
              <DropdownMenuItem onClick={onReconcile}>
                <Scale className="h-4 w-4 mr-2" />
                Reconcile
              </DropdownMenuItem>
            )}
            
            {onExport && (
              <DropdownMenuItem onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </DropdownMenuItem>
            )}
            
            {onRefresh && (
              <DropdownMenuItem onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </DropdownMenuItem>
            )}
            
            <DropdownMenuItem onClick={() => setIsColumnSelectorOpen(true)}>
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Columns
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default TableHeaderComponent;
