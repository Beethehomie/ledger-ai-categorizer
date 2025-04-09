
import React from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2, LinkIcon, DatabaseIcon, Edit } from 'lucide-react';
import { BankConnectionRow } from '@/types/supabase';
import { EditConnection } from './EditConnection';

interface ConnectionListProps {
  connections: BankConnectionRow[];
  syncing: string | null;
  editingId: string | null;
  onEdit: (id: string) => void;
  onSync: (connection: BankConnectionRow) => void;
  onDelete: (id: string) => void;
  onSave: (id: string, displayName: string) => void;
  onCancelEdit: () => void;
}

export const ConnectionList: React.FC<ConnectionListProps> = ({
  connections,
  syncing,
  editingId,
  onEdit,
  onSync,
  onDelete,
  onSave,
  onCancelEdit
}) => {
  return (
    <>
      {connections.map(connection => (
        <div key={connection.id}>
          <div className="flex items-center justify-between p-3 border rounded-md bg-card hover:bg-accent/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-full">
                {connection.connection_type === 'api' ? (
                  <LinkIcon className="h-5 w-5 text-primary" />
                ) : (
                  <DatabaseIcon className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <h4 className="font-medium">
                  {connection.display_name || connection.bank_name}
                  {connection.display_name && connection.display_name !== connection.bank_name && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({connection.bank_name})
                    </span>
                  )}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {connection.connection_type === 'api' ? 'API Connection' : 'CSV Upload'}
                  {connection.last_sync && ` · Last sync: ${new Date(connection.last_sync).toLocaleString()}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => onEdit(connection.id)}
                className="hover-scale"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onSync(connection)}
                disabled={syncing === connection.id}
                className="hover-scale"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${syncing === connection.id ? 'animate-spin' : ''}`} />
                {syncing === connection.id ? 'Syncing...' : 'Sync Now'}
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => onDelete(connection.id)}
                className="text-destructive hover:bg-destructive/10 hover-scale"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {editingId === connection.id && (
            <EditConnection 
              connection={connection}
              onSave={onSave}
              onCancel={onCancelEdit}
            />
          )}
        </div>
      ))}
    </>
  );
};
