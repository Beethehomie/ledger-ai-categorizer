
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/utils/toast';
import { Plus, RefreshCw, Trash2, LinkIcon, DatabaseIcon } from 'lucide-react';
import { useBookkeeping } from '@/context/BookkeepingContext';
import { BankConnection } from '@/types';
import { BankConnectionRow } from '@/types/supabase';

const BankConnections: React.FC = () => {
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newConnection, setNewConnection] = useState({
    bank_name: '',
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
      
      // Convert database rows to our app's BankConnection type
      const formattedConnections: BankConnection[] = (data || []).map((row: BankConnectionRow) => ({
        id: row.id,
        bank_name: row.bank_name,
        connection_type: row.connection_type,
        last_sync: row.last_sync,
        api_details: row.api_details
      }));
      
      setConnections(formattedConnections);
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
          connection_type: newConnection.connection_type,
          user_id: user.id,
          api_details: newConnection.connection_type === 'api' ? { status: 'needs_setup' } : null,
        })
        .select();
        
      if (error) throw error;
      
      toast.success('Bank connection added successfully');
      
      // Convert the returned data to our app's BankConnection type
      const newConnections: BankConnection[] = (data || []).map((row: BankConnectionRow) => ({
        id: row.id,
        bank_name: row.bank_name,
        connection_type: row.connection_type,
        last_sync: row.last_sync,
        api_details: row.api_details
      }));
      
      setConnections([...connections, ...newConnections]);
      setShowAddForm(false);
      setNewConnection({ bank_name: '', connection_type: 'csv' });
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

  const handleSyncBank = async (connection: BankConnection) => {
    if (!user) return;
    
    try {
      setSyncing(connection.id);
      
      // For CSV type, we don't do anything - user will upload manually
      if (connection.connection_type === 'csv') {
        toast.info('Please use the CSV upload feature for this connection');
        return;
      }
      
      // For API type, call our edge function
      const { data, error } = await supabase.functions.invoke('sync-bank-transactions', {
        body: { connectionId: connection.id }
      });
      
      if (error) throw error;
      
      if (data.transactions && data.transactions.length > 0) {
        // Format the transactions for our app
        const formattedTransactions = data.transactions.map((t: any) => ({
          id: crypto.randomUUID(),
          date: t.date,
          description: t.description,
          amount: t.amount,
          isVerified: false
        }));
        
        // Add the transactions to our app
        addTransactions(formattedTransactions);
        toast.success(`Synchronized ${formattedTransactions.length} transactions`);
      } else {
        toast.info('No new transactions found');
      }
      
      // Refresh the connections list to get updated last_sync
      fetchConnections();
      
    } catch (error: any) {
      toast.error(`Error syncing transactions: ${error.message}`);
    } finally {
      setSyncing(null);
    }
  };

  return (
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
                  <div key={connection.id} className="flex items-center justify-between p-3 border rounded-md bg-card hover:bg-accent/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        {connection.connection_type === 'api' ? (
                          <LinkIcon className="h-5 w-5 text-primary" />
                        ) : (
                          <DatabaseIcon className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{connection.bank_name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {connection.connection_type === 'api' ? 'API Connection' : 'CSV Upload'}
                          {connection.last_sync && ` · Last sync: ${new Date(connection.last_sync).toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
  );
};

export default BankConnections;
