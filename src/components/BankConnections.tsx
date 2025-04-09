
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/utils/toast';
import { Plus, RefreshCw, Trash2, LinkIcon, DatabaseIcon, Edit } from 'lucide-react';
import { useBookkeeping } from '@/context/BookkeepingContext';
import { BankConnectionRow } from '@/types/supabase';
import FileUpload from './FileUpload';
import { ConnectionList } from './bank-connections/ConnectionList';
import { AddConnectionForm } from './bank-connections/AddConnectionForm';
import { EditConnection } from './bank-connections/EditConnection';

const BankConnections: React.FC = () => {
  const [connections, setConnections] = useState<BankConnectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { addTransactions } = useBookkeeping();

  const fetchConnections = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bank_connections')
        .select('*')
        .order('bank_name', { ascending: true });
        
      if (error) throw error;
      
      setConnections(data || []);
    } catch (error: any) {
      toast.error(`Error fetching connections: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [user]);

  const handleAddConnection = async (newConnection: {
    bank_name: string;
    display_name: string;
    connection_type: string;
  }) => {
    if (!user || !newConnection.bank_name) return;
    
    try {
      const { data, error } = await supabase
        .from('bank_connections')
        .insert({
          bank_name: newConnection.bank_name,
          display_name: newConnection.display_name || newConnection.bank_name,
          connection_type: newConnection.connection_type,
          user_id: user.id,
          api_details: newConnection.connection_type === 'api' ? { status: 'needs_setup' } : null,
        })
        .select();
        
      if (error) throw error;
      
      toast.success('Bank connection added successfully');
      
      setConnections([...connections, ...(data || [])]);
      setShowAddForm(false);
    } catch (error: any) {
      toast.error(`Error adding connection: ${error.message}`);
    }
  };

  const handleDeleteConnection = async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('bank_connections')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success('Bank connection deleted');
      setConnections(connections.filter(c => c.id !== id));
    } catch (error: any) {
      toast.error(`Error deleting connection: ${error.message}`);
    }
  };

  const handleUpdateDisplayName = async (id: string, displayName: string) => {
    if (!user || !displayName) return;
    
    try {
      const { error } = await supabase
        .from('bank_connections')
        .update({ display_name: displayName })
        .eq('id', id);
        
      if (error) throw error;
      
      setConnections(prev => 
        prev.map(conn => 
          conn.id === id ? { ...conn, display_name: displayName } : conn
        )
      );
      
      setEditingId(null);
      toast.success('Display name updated');
    } catch (error: any) {
      toast.error(`Error updating display name: ${error.message}`);
    }
  };

  const handleSyncBank = async (connection: BankConnectionRow) => {
    if (!user) return;
    
    try {
      setSyncing(connection.id);
      
      if (connection.connection_type === 'csv') {
        toast.info('Please use the CSV upload feature for this connection');
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('sync-bank-transactions', {
        body: { connectionId: connection.id }
      });
      
      if (error) throw error;
      
      if (data.transactions && data.transactions.length > 0) {
        const formattedTransactions = data.transactions.map((t: any) => ({
          id: crypto.randomUUID(),
          date: t.date,
          description: t.description,
          amount: t.amount,
          isVerified: false,
          bankAccountId: connection.id,
          bankAccountName: connection.display_name || connection.bank_name
        }));
        
        addTransactions(formattedTransactions);
        toast.success(`Synchronized ${formattedTransactions.length} transactions`);
      } else {
        toast.info('No new transactions found');
      }
      
      fetchConnections();
      
    } catch (error: any) {
      toast.error(`Error syncing transactions: ${error.message}`);
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="hover:shadow-md transition-all animate-fade-in">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <DatabaseIcon className="h-5 w-5" />
            Bank Connections
          </CardTitle>
          <CardDescription>
            Manage your bank connections for automatic transaction import
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Loading bank connections...</p>
          ) : (
            <div className="space-y-4">
              {connections.length === 0 && !showAddForm ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-2">No bank connections yet</p>
                  <Button 
                    onClick={() => setShowAddForm(true)}
                    className="hover-scale"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add your first bank connection
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <ConnectionList 
                    connections={connections}
                    syncing={syncing}
                    editingId={editingId}
                    onEdit={setEditingId}
                    onSync={handleSyncBank}
                    onDelete={handleDeleteConnection}
                    onSave={handleUpdateDisplayName}
                    onCancelEdit={() => setEditingId(null)}
                  />
                </div>
              )}
              
              {showAddForm ? (
                <AddConnectionForm 
                  onAdd={handleAddConnection}
                  onCancel={() => setShowAddForm(false)}
                />
              ) : (
                connections.length > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddForm(true)}
                    className="w-full hover-scale"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Another Bank Connection
                  </Button>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      <FileUpload />
    </div>
  );
};

export default BankConnections;
