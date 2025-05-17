
import React from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, Scale, Columns } from "lucide-react";
import { Column } from './ColumnSelector';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface TableHeaderProps {
  filter: 'all' | 'unverified' | 'profit_loss' | 'balance_sheet' | 'by_vendor' | 'review';
  vendorName?: string;
  isAccountReconciled: boolean;
  onRefresh: () => void;
  onExport: () => void;
  onUpload: () => void;
  onReconcile: () => void;
  onAddVendor: () => void;
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
  const getTitle = () => {
    switch (filter) {
      case 'unverified': return 'Unverified Transactions';
      case 'profit_loss': return 'Profit & Loss Transactions';
      case 'balance_sheet': return 'Balance Sheet Transactions';
      case 'by_vendor': return vendorName ? `${vendorName} Transactions` : 'Vendor Transactions';
      case 'review': return 'Transactions Needing Review';
      default: return 'All Transactions';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
      <div className="flex items-center">
        <h2 className="text-lg font-semibold">{getTitle()}</h2>
        {isAccountReconciled && (
          <div className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            Reconciled
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onRefresh}
        >
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onExport}
        >
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onReconcile}
        >
          <Scale className="h-4 w-4 mr-1" /> Reconcile
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <Columns className="h-4 w-4 mr-1" /> Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {columns.map(column => (
              <DropdownMenuItem key={column.id} onClick={e => e.preventDefault()} className="flex items-center gap-2">
                <Checkbox 
                  id={`column-${column.id}`}
                  checked={column.visible}
                  onCheckedChange={() => onToggleColumn(column.id)}
                />
                <Label 
                  htmlFor={`column-${column.id}`} 
                  className="flex-grow cursor-pointer"
                >
                  {column.label}
                </Label>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default TableHeaderComponent;
