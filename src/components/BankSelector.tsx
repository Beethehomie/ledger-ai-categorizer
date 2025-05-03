
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BankConnectionRow } from "@/types/supabase";

interface BankSelectorProps {
  selectedBankId: string;
  onSelectBank: (bankId: string) => void;
  bankConnections: BankConnectionRow[];
  required?: boolean;
  label?: string;
  placeholder?: string;
}

const BankSelector: React.FC<BankSelectorProps> = ({
  selectedBankId,
  onSelectBank,
  bankConnections,
  required = true,
  label = "Bank Account",
  placeholder = "Select a bank account"
}) => {
  // Filter only CSV type bank connections
  const csvBankConnections = bankConnections.filter(conn => conn.connection_type === 'csv');

  return (
    <Select
      value={selectedBankId}
      onValueChange={onSelectBank}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {csvBankConnections.length === 0 ? (
          <SelectItem value="no-accounts" disabled>
            No CSV Bank Accounts Available
          </SelectItem>
        ) : (
          csvBankConnections.map((conn) => (
            <SelectItem key={conn.id} value={conn.id}>
              {conn.display_name || conn.bank_name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
};

export default BankSelector;
