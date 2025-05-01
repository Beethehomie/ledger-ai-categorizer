
import React, { useState, useEffect } from 'react';
import { Activity, Database, RefreshCw, User, FileUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';

interface DashboardStats {
  totalUsers: number;
  totalBankAccounts: number;
  totalTransactions: number;
  databaseSize: string;
  openaiTokenUsage: number;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalBankAccounts: 0,
    totalTransactions: 0,
    databaseSize: '0 MB',
    openaiTokenUsage: 0
  });
  
  const [isLoading, setIsLoading] = useState(false);
  
  const fetchAdminStats = async () => {
    setIsLoading(true);
    try {
      // Call to Supabase function to get system stats
      const { data, error } = await supabase.functions.invoke('sync-bank-transactions', {
        body: { getStats: true }
      });
      
      if (error) throw error;
      
      if (data && data.stats) {
        setStats({
          totalUsers: data.stats.userCount || 0,
          totalBankAccounts: data.stats.bankConnectionCount || 0,
          totalTransactions: data.stats.transactionCount || 0,
          databaseSize: `${(data.stats.databaseSize || 0).toFixed(2)} MB`,
          openaiTokenUsage: data.stats.aiProcessedCount || 0
        });
        toast.success('Stats refreshed successfully');
      }
    } catch (err: any) {
      console.error('Error fetching admin stats:', err);
      toast.error('Failed to refresh stats: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch stats on component mount
  useEffect(() => {
    fetchAdminStats();
  }, []);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">System Overview</h2>
        <Button 
          onClick={fetchAdminStats} 
          variant="outline" 
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 border-t-2 border-b-2 border-current rounded-full animate-spin mr-2" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Stats
            </>
          )}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <User className="h-4 w-4 mr-2 text-primary" />
              Users
            </CardTitle>
            <CardDescription>Total registered users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Database className="h-4 w-4 mr-2 text-primary" />
              Bank Accounts
            </CardTitle>
            <CardDescription>Connected accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalBankAccounts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <FileUp className="h-4 w-4 mr-2 text-primary" />
              Transactions
            </CardTitle>
            <CardDescription>Total uploaded transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalTransactions}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Database className="h-4 w-4 mr-2 text-primary" />
              Database Size
            </CardTitle>
            <CardDescription>Storage used</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.databaseSize}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Activity className="h-4 w-4 mr-2 text-primary" />
              OpenAI Usage
            </CardTitle>
            <CardDescription>API calls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.openaiTokenUsage}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
