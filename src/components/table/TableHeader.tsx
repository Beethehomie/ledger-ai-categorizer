
import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw, 
  FileDown, 
  FileUp, 
  CheckCircle, 
  MoreVertical, 
  PlusCircle,
  CheckSquare 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TableHeaderProps {
  filter: string;
  vendorName?: string;
  isAccountReconciled?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
  onUpload?: () => void;
  onReconcile?: () => void;
  onAddVendor?: () => void;
  onToggleColumn?: (column: string) => void;
  onBusinessContext?: () => void;
  columns?: { id: string; label: string; visible: boolean }[];
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
  onBusinessContext,
  columns
}) => {
  const getTitle = () => {
    switch (filter) {
      case 'unverified':
        return 'Unverified Transactions';
      case 'profit_loss':
        return 'Profit & Loss Transactions';
      case 'balance_sheet':
        return 'Balance Sheet Transactions';
      case 'by_vendor':
        return vendorName ? `Vendor: ${vendorName}` : 'Transactions by Vendor';
      case 'review':
        return 'Transactions for Review';
      default:
        return 'All Transactions';
    }
  };
  
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h3 className="font-semibold text-lg leading-none tracking-tight">
          {getTitle()}
          {isAccountReconciled && (
            <span className="ml-2 inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
              <CheckCircle className="h-3.5 w-3.5 text-green-500 mr-1" />
              Reconciled
            </span>
          )}
        </h3>
        <p className="text-sm text-muted-foreground">
          Manage your financial transactions
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        {onExport && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onExport}
            className="hidden md:flex"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
        
        {onUpload && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onUpload}
            className="hidden md:flex"
          >
            <FileUp className="h-4 w-4 mr-2" />
            Upload
          </Button>
        )}
        
        {onAddVendor && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onAddVendor}
            className="hidden md:flex"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Vendor
          </Button>
        )}
        
        {onBusinessContext && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onBusinessContext}
            className="hidden md:flex"
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            Business Context
          </Button>
        )}
        
        {onReconcile && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onReconcile}
            className="hidden md:flex"
            disabled={isAccountReconciled}
          >
            <CheckCircle className={cn("h-4 w-4 mr-2", isAccountReconciled && "text-green-500")} />
            Reconcile
          </Button>
        )}
        
        {onRefresh && (
          <Button 
            variant="outline" 
            size="icon"
            onClick={onRefresh}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        
        {(columns && onToggleColumn) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.visible}
                  onCheckedChange={() => onToggleColumn(column.id)}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              
              {/* Mobile-only options */}
              <div className="md:hidden">
                {onExport && (
                  <DropdownMenuCheckboxItem onClick={onExport}>
                    <FileDown className="h-4 w-4 mr-2" /> Export
                  </DropdownMenuCheckboxItem>
                )}
                
                {onUpload && (
                  <DropdownMenuCheckboxItem onClick={onUpload}>
                    <FileUp className="h-4 w-4 mr-2" /> Upload
                  </DropdownMenuCheckboxItem>
                )}
                
                {onBusinessContext && (
                  <DropdownMenuCheckboxItem onClick={onBusinessContext}>
                    <CheckSquare className="h-4 w-4 mr-2" /> Business Context
                  </DropdownMenuCheckboxItem>
                )}
                
                {onReconcile && (
                  <DropdownMenuCheckboxItem onClick={onReconcile} disabled={isAccountReconciled}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Reconcile
                  </DropdownMenuCheckboxItem>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

export default TableHeaderComponent;
