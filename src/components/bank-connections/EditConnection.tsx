
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BankConnectionRow } from '@/types/supabase';

interface EditConnectionProps {
  connection: BankConnectionRow;
  onSave: (id: string, displayName: string) => void;
  onCancel: () => void;
}

export const EditConnection: React.FC<EditConnectionProps> = ({ connection, onSave, onCancel }) => {
  const [displayName, setDisplayName] = useState(connection.display_name || connection.bank_name);
  
  return (
    <div className="p-3 border rounded-md mt-2 animate-fade-in">
      <Label htmlFor="display-name" className="text-sm">Display Name</Label>
      <Input 
        id="display-name" 
        value={displayName} 
        onChange={(e) => setDisplayName(e.target.value)} 
        className="mb-2 mt-1"
      />
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={() => onSave(connection.id, displayName)}>
          Save
        </Button>
      </div>
    </div>
  );
};
