
import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CheckSquare, Square, SlidersHorizontal } from "lucide-react";

export interface Column {
  id: string;
  label: string;
  visible: boolean;
}

interface ColumnSelectorProps {
  columns: Column[];
  onToggleColumn: (columnId: string) => void;
}

const ColumnSelector: React.FC<ColumnSelectorProps> = ({ columns, onToggleColumn }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="hover-scale">
          <SlidersHorizontal className="h-4 w-4 mr-1" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Table Columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => (
          <DropdownMenuItem
            key={column.id}
            onClick={(e) => {
              e.preventDefault();
              onToggleColumn(column.id);
            }}
            className="flex items-center cursor-pointer"
          >
            {column.visible ? (
              <CheckSquare className="mr-2 h-4 w-4 text-[hsl(var(--primary))]" />
            ) : (
              <Square className="mr-2 h-4 w-4" />
            )}
            {column.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ColumnSelector;
