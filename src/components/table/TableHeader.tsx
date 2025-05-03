
import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuCheckboxItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, RefreshCw, Upload, Download, PlusCircle, Settings, FileUp } from "lucide-react";
import { cn } from '@/lib/utils';

interface TableHeaderProps {
  filter?: string;
  vendorName?: string;
  onRefresh?: () => void;
  onExport?: () => void;
  onUpload?: () => void;
  onReconcile?: () => void;
  onAddVendor?: () => void;
  isAccountReconciled?: boolean;
  onToggleColumn?: (id: string) => void;
  columns?: { id: string; label: string; visible: boolean }[];
  reconciliationStatus?: React.ReactNode;
}

const TableHeaderComponent: React.FC<TableHeaderProps> = ({
  filter,
  vendorName,
  onRefresh,
  onExport,
  onUpload,
  onReconcile,
  onAddVendor,
  isAccountReconciled,
  onToggleColumn,
  columns = [],
  reconciliationStatus
}) => {
  const headerTitle = () => {
    switch(filter) {
      case 'all':
        return 'All Transactions';
      case 'unverified':
        return 'Unverified Transactions';
      case 'profit_loss':
        return 'Profit & Loss Transactions';
      case 'balance_sheet':
        return 'Balance Sheet Transactions';
      case 'by_vendor':
        return vendorName ? `Transactions for ${vendorName}` : 'Transactions by Vendor';
      case 'review':
        return 'Transactions Needing Review';
      default:
        return 'Transactions';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium">{headerTitle()}</h3>
          
          {reconciliationStatus && (
            <div className="ml-2">
              {reconciliationStatus}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {onRefresh && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={onRefresh}
                  className="hover-scale"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          )}
          
          {onExport && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={onExport}
                  className="hover-scale"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export CSV</TooltipContent>
            </Tooltip>
          )}
          
          {onUpload && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={onUpload}
                  className="hover-scale"
                >
                  <FileUp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Upload CSV</TooltipContent>
            </Tooltip>
          )}
          
          {onAddVendor && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={onAddVendor}
                  className="hover-scale"
                >
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add Vendor</TooltipContent>
            </Tooltip>
          )}
          
          {onReconcile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={onReconcile}
                  className={cn(
                    "hover-scale",
                    isAccountReconciled && "border-green-300 text-green-600"
                  )}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reconcile Account</TooltipContent>
            </Tooltip>
          )}
          
          {onToggleColumn && columns.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
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
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableHeaderComponent;
