import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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

interface EditConnectionProps {
  connection: BankConnectionRow;
  onSave: (id: string, displayName: string) => void;
  onCancel: () => void;
}

const EditConnection: React.FC<EditConnectionProps> = ({ connection, onSave, onCancel }) => {
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

const BankConnections: React.FC = () => {
  const [connections, setConnections] = useState<BankConnectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newConnection, setNewConnection] = useState({
    bank_name: '',
    display_name: '',
    connection_type: 'csv', // Default to CSV
  });
  
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

  const handleAddConnection = async () => {
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
      setNewConnection({ bank_name: '', display_name: '', connection_type: 'csv' });
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
                            onClick={() => setEditingId(connection.id)}
                            className="hover-scale"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSyncBank(connection)}
                            disabled={syncing === connection.id}
                            className="hover-scale"
                          >
                            <RefreshCw className={`h-4 w-4 mr-1 ${syncing === connection.id ? 'animate-spin' : ''}`} />
                            {syncing === connection.id ? 'Syncing...' : 'Sync Now'}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handleDeleteConnection(connection.id)}
                            className="text-destructive hover:bg-destructive/10 hover-scale"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {editingId === connection.id && (
                        <EditConnection 
                          connection={connection}
                          onSave={handleUpdateDisplayName}
                          onCancel={() => setEditingId(null)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {showAddForm && (
                <div className="border rounded-md p-4 bg-card mt-4 animate-fade-in">
                  <h3 className="font-medium mb-3">Add New Bank Connection</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bank_name">Bank Name</Label>
                      <Input 
                        id="bank_name" 
                        value={newConnection.bank_name}
                        onChange={(e) => setNewConnection({...newConnection, bank_name: e.target.value})}
                        placeholder="Enter bank name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="display_name">Display Name (Optional)</Label>
                      <Input 
                        id="display_name" 
                        value={newConnection.display_name}
                        onChange={(e) => setNewConnection({...newConnection, display_name: e.target.value})}
                        placeholder="Enter display name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="connection_type">Connection Type</Label>
                      <Select 
                        value={newConnection.connection_type}
                        onValueChange={(value) => setNewConnection({...newConnection, connection_type: value})}
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
                        onClick={() => setShowAddForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleAddConnection}
                        disabled={!newConnection.bank_name}
                      >
                        Add Connection
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {!showAddForm && connections.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddForm(true)}
                  className="w-full hover-scale"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Another Bank Connection
                </Button>
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
