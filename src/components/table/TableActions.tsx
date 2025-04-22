
import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Upload, Download, Scale } from 'lucide-react';

interface TableActionsProps {
  onRefresh: () => void;
  onExport: () => void;
  onUpload: () => void;
  onReconcile: () => void;
}

const TableActions: React.FC<TableActionsProps> = ({
  onRefresh,
  onExport,
  onUpload,
  onReconcile
}) => {
  return (
    <TooltipProvider>
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
      </div>
    </TooltipProvider>
  );
};

export default TableActions;
