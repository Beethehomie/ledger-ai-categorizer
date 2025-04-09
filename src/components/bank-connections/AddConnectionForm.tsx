
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NewConnectionState {
  bank_name: string;
  display_name: string;
  connection_type: string;
}

interface AddConnectionFormProps {
  onAdd: (newConnection: NewConnectionState) => void;
  onCancel: () => void;
}

export const AddConnectionForm: React.FC<AddConnectionFormProps> = ({ onAdd, onCancel }) => {
  const [newConnection, setNewConnection] = useState<NewConnectionState>({
    bank_name: '',
    display_name: '',
    connection_type: 'csv', // Default to CSV
  });

  const handleChange = (field: keyof NewConnectionState, value: string) => {
    setNewConnection(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="border rounded-md p-4 bg-card mt-4 animate-fade-in">
      <h3 className="font-medium mb-3">Add New Bank Connection</h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bank_name">Bank Name</Label>
          <Input 
            id="bank_name" 
            value={newConnection.bank_name}
            onChange={(e) => handleChange('bank_name', e.target.value)}
            placeholder="Enter bank name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="display_name">Display Name (Optional)</Label>
          <Input 
            id="display_name" 
            value={newConnection.display_name}
            onChange={(e) => handleChange('display_name', e.target.value)}
            placeholder="Enter display name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="connection_type">Connection Type</Label>
          <Select 
            value={newConnection.connection_type}
            onValueChange={(value) => handleChange('connection_type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select connection type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV Upload</SelectItem>
              <SelectItem value="api">API Connection (Demo)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button 
            variant="outline" 
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => onAdd(newConnection)}
            disabled={!newConnection.bank_name}
          >
            Add Connection
          </Button>
        </div>
      </div>
    </div>
  );
};
