
import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Search, FileDown, User, CircleDollarSign, CheckCircle, XCircle } from "lucide-react";
import { toast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

interface UserAccount {
  id: string;
  email: string;
  fullName?: string;
  subscriptionTier: string;
  created_at: string;
  bankAccounts: BankAccount[];
  transactionCount: number;
  transactionsReconciled: boolean;
}

interface BankAccount {
  id: string;
  name: string;
  connectionType: string;
  balance: number;
  lastSync?: string;
}

export const ClientsManagement: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Fetch user profiles
      const { data: userProfiles, error: userError } = await supabase
        .from('user_profiles')
        .select('*');
        
      if (userError) throw userError;
      
      // Fetch bank connections
      const { data: bankConnections, error: bankError } = await supabase
        .from('bank_connections')
        .select('*');
        
      if (bankError) throw bankError;
      
      // Count transactions per user - using a simpler approach
      const { data: transactionsData, error: transactionError } = await supabase
        .from('bank_transactions')
        .select('user_id');
        
      if (transactionError) throw transactionError;
      
      // Manually count transactions per user
      const transactionCounts: Record<string, number> = {};
      transactionsData?.forEach(transaction => {
        if (transaction.user_id) {
          transactionCounts[transaction.user_id] = (transactionCounts[transaction.user_id] || 0) + 1;
        }
      });
      
      // Process data
      const processedUsers: UserAccount[] = userProfiles.map(user => {
        // Find bank connections for this user
        const userBankAccounts = bankConnections
          .filter(conn => conn.user_id === user.id)
          .map(conn => {
            // Safely access currentBalance from api_details
            let balance = 0;
            if (conn.api_details && 
                typeof conn.api_details === 'object' && 
                conn.api_details !== null) {
              // Try to access currentBalance safely
              const apiDetails = conn.api_details as Record<string, any>;
              balance = typeof apiDetails.currentBalance === 'number' 
                ? apiDetails.currentBalance 
                : 0;
            }
            
            return {
              id: conn.id,
              name: conn.display_name || conn.bank_name,
              connectionType: conn.connection_type,
              balance: balance,
              lastSync: conn.last_sync
            };
          });
          
        // Get transaction count for this user
        const transactionCount = transactionCounts[user.id] || 0;
        
        // Check if transactions are reconciled
        const transactionsReconciled = userBankAccounts.some(acc => 
          acc.lastSync && new Date(acc.lastSync) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        );
        
        return {
          id: user.id,
          email: user.email || '',
          fullName: user.full_name,
          subscriptionTier: user.subscription_tier,
          created_at: user.created_at,
          bankAccounts: userBankAccounts,
          transactionCount,
          transactionsReconciled
        };
      });
      
      setUsers(processedUsers);
      toast.success('Client data loaded successfully');
    } catch (err: any) {
      console.error('Error fetching users:', err);
      toast.error('Failed to load client data: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.fullName && user.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const exportUserData = () => {
    try {
      const dataStr = JSON.stringify(users, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `clients_export_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success('Client data exported successfully');
    } catch (error) {
      toast.error('Failed to export client data');
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Clients Management</h2>
        
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Button
            variant="outline"
            onClick={fetchUsers}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
          
          <Button
            variant="outline"
            onClick={exportUserData}
            className="flex items-center gap-2"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <Accordion type="multiple" className="w-full">
            {filteredUsers.map(user => (
              <AccordionItem key={user.id} value={user.id}>
                <AccordionTrigger className="px-4 py-2 hover:bg-muted/50">
                  <div className="flex items-center w-full">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{user.email}</span>
                      {user.fullName && <span className="text-muted-foreground">({user.fullName})</span>}
                    </div>
                    
                    <div className="ml-auto flex items-center gap-6">
                      <div className="text-sm">
                        <span className="font-semibold">{user.bankAccounts.length}</span> accounts
                      </div>
                      
                      <div className="text-sm">
                        <span className="font-semibold">{user.transactionCount}</span> transactions
                      </div>
                      
                      <div className="flex items-center">
                        {user.transactionsReconciled ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                
                <AccordionContent>
                  <div className="px-4 py-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Subscription Tier</p>
                        <p className="font-medium">{user.subscriptionTier}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground">Joined</p>
                        <p className="font-medium">{new Date(user.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Bank Accounts</h4>
                      
                      {user.bankAccounts.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Balance</TableHead>
                              <TableHead>Last Sync</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {user.bankAccounts.map(account => (
                              <TableRow key={account.id}>
                                <TableCell className="flex items-center gap-2">
                                  <CircleDollarSign className="h-4 w-4" />
                                  {account.name}
                                </TableCell>
                                <TableCell>{account.connectionType}</TableCell>
                                <TableCell>${account.balance.toFixed(2)}</TableCell>
                                <TableCell>
                                  {account.lastSync 
                                    ? new Date(account.lastSync).toLocaleDateString()
                                    : 'Never'
                                  }
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-muted-foreground text-sm">No bank accounts connected.</p>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          
          {filteredUsers.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No clients found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
