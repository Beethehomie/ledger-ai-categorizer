
import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface Column {
  id: string;
  label: string;
  visible: boolean;
}

interface ColumnSelectorProps {
  columns: Column[];
  onToggle: (columnId: string) => void;
}

const ColumnSelector: React.FC<ColumnSelectorProps> = ({ columns, onToggle }) => {
  return (
    <div className="p-4 space-y-3">
      <h3 className="font-semibold mb-2">Visible Columns</h3>
      {columns.map((column) => (
        <div key={column.id} className="flex items-center space-x-2">
          <Checkbox
            id={`column-${column.id}`}
            checked={column.visible}
            onCheckedChange={() => onToggle(column.id)}
          />
          <Label htmlFor={`column-${column.id}`} className="cursor-pointer">
            {column.label}
          </Label>
        </div>
      ))}
    </div>
  );
};

export default ColumnSelector;
