
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BankConnectionRow } from '@/types/supabase';

interface BankSelectorProps {
  connections: any[];
  value: string;
  onChange: (value: string) => void;
}

const BankSelector: React.FC<BankSelectorProps> = ({ connections, value, onChange }) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a bank account" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">-- None --</SelectItem>
        {connections.map(connection => (
          <SelectItem key={connection.id} value={connection.id}>
            {connection.display_name || connection.bank_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default BankSelector;
