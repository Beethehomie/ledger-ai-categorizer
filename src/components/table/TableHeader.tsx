
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Upload, Download, Scale, Store, Plus, CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ColumnSelector from '../ColumnSelector';

interface TableHeaderProps {
  filter: string;
  vendorName?: string;
  isAccountReconciled: boolean;
  onRefresh: () => void;
  onExport: () => void;
  onUpload: () => void;
  onReconcile: () => void;
  onAddVendor: () => void;
  onToggleColumn: (columnId: string) => void;
  columns: { id: string; label: string; visible: boolean }[];
}

const TableHeader: React.FC<TableHeaderProps> = ({
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
  const getTableTitle = () => {
    if (filter === 'unverified') return 'Transactions For Review';
    if (filter === 'profit_loss') return 'Profit & Loss Transactions';
    if (filter === 'balance_sheet') return 'Balance Sheet Transactions';
    if (filter === 'by_vendor' && vendorName) return `Transactions for ${vendorName}`;
    if (filter === 'review') return 'Transactions Requiring Review';
    return 'All Transactions';
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <h2 className="text-lg font-semibold">
          {getTableTitle()}
          {isAccountReconciled && (
            <span className="ml-2 inline-flex items-center text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Reconciled
            </span>
          )}
        </h2>
        
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="hover-scale"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Refresh transactions and reports</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onAddVendor}
                className="hover-scale"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Vendor
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add a new vendor</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="hover-scale"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Export transactions to CSV</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onReconcile}
                className="hover-scale"
              >
                <Scale className="h-4 w-4 mr-1" />
                Reconcile
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reconcile your account balance</p>
            </TooltipContent>
          </Tooltip>
          
          <ColumnSelector
            columns={columns}
            onToggleColumn={onToggleColumn}
          />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default TableHeader;
