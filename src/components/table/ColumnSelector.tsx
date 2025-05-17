
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface Column {
  id: string;
  label: string;
  visible: boolean;
}

export interface ColumnSelectorProps {
  columns: Column[];
  onToggle: (columnId: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  columns,
  onToggle,
  onOpenChange,
  open
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Columns</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select which columns to display in the table.
          </p>
          <div className="space-y-2">
            {columns.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`column-${column.id}`}
                  checked={column.visible}
                  onCheckedChange={() => onToggle(column.id)}
                />
                <Label
                  htmlFor={`column-${column.id}`}
                  className="cursor-pointer"
                >
                  {column.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ColumnSelector;
