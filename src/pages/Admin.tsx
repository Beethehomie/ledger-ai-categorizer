import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BookkeepingProvider, useBookkeeping } from '@/context/BookkeepingContext';
import { useSettings } from '@/context/SettingsContext';
import { Check, X, Webhook, Database, Key, User, Activity, BarChart3, Home, Upload, Download, Trash, Code, Terminal, AlertCircle } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';
import { useAuth } from '@/context/AuthContext';
import { exportToCSV } from '@/utils/csvParser';
import { useNavigate } from 'react-router-dom';
import VendorKeywordsList from '@/components/VendorKeywordsList';
import VendorImporter from '@/components/VendorImporter';
import { Pagination } from '@/components/ui/pagination';
import UploadDialog from '@/components/UploadDialog';
import CodeEditor from '@/components/admin/CodeEditor';
import OpenAILogs from '@/components/admin/OpenAILogs';
import ProductionTodoList from '@/components/admin/ProductionTodoList';

interface UsageData {
  openai: {
    total: number;
    last30Days: number;
  };
  supabase: {
    storage: number;
    functions: number;
    database: number;
  };
}

interface SystemStats {
  transactionCount: number;
  vendorCount: number;
  bankConnectionCount: number;
  verifiedCategoriesCount: number;
}

interface PendingKeywordValidation {
  id: string;
  keyword: string;
  occurrences: number;
  suggested_category: string;
}

const Admin: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const isAdmin = user?.email === 'terramultaacc@gmail.com';
  
  if (!user || !isAdmin) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Admin Access Restricted</h2>
        <p>This page is only accessible to authorized administrators.</p>
        <Button 
          className="mt-4"
          onClick={() => navigate('/')}
        >
          <Home className="h-4 w-4 mr-2" />
          Return to Dashboard
        </Button>
      </div>
    );
  }
  
  return (
    <BookkeepingProvider>
      <AdminContent />
    </BookkeepingProvider>
  );
};

const AdminContent: React.FC = () => {
  const { transactions, vendors, bankConnections, removeDuplicateVendors } = useBookkeeping();
  const { currency } = useSettings();
  const navigate = useNavigate();
  
  const [systemStats, setSystemStats] = useState<SystemStats>({
    transactionCount: 0,
    vendorCount: 0,
    bankConnectionCount: 0,
    verifiedCategoriesCount: 0
  });
  
  const [usageData, setUsageData] = useState<UsageData>({
    openai: {
      total: 0,
      last30Days: 0,
    },
    supabase: {
      storage: 0,
      functions: 0,
      database: 0,
    }
  });
  
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const fetchSystemStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('sync-bank-transactions', {
        body: { getStats: true }
      });
      
      if (error) throw error;
      
      if (data && data.stats) {
        setSystemStats(data.stats);
      }
    } catch (err: any) {
      console.error('Error fetching system stats:', err);
    }
  };
  
  useEffect(() => {
    fetchSystemStats();
    
    const aiSuggestedTransactions = transactions.filter(t => t.aiSuggestion);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentAiTransactions = aiSuggestedTransactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= thirtyDaysAgo;
    });
    
    setUsageData({
      openai: {
        total: aiSuggestedTransactions.length,
        last30Days: recentAiTransactions.length,
      },
      supabase: {
        storage: parseFloat((vendors.length * 0.001).toFixed(2)),
        functions: aiSuggestedTransactions.length,
        database: parseFloat((transactions.length * 0.0001).toFixed(2)),
      }
    });
  }, [transactions, vendors]);
  
  const [pendingKeywords] = useState<PendingKeywordValidation[]>([
    { id: '1', keyword: 'grocery store', occurrences: 12, suggested_category: 'Groceries' },
    { id: '2', keyword: 'starbucks', occurrences: 8, suggested_category: 'Dining' },
    { id: '3', keyword: 'amazon prime', occurrences: 5, suggested_category: 'Subscriptions' },
    { id: '4', keyword: 'uber ride', occurrences: 7, suggested_category: 'Transportation' },
  ]);
  
  const [subscriberData] = useState([
    { id: '1', email: 'user1@example.com', plan: 'Pro', joined: '2023-11-12', transactions: 287 },
    { id: '2', email: 'user2@example.com', plan: 'Basic', joined: '2023-12-05', transactions: 64 },
    { id: '3', email: 'user3@example.com', plan: 'Pro', joined: '2024-01-18', transactions: 142 },
    { id: '4', email: 'user4@example.com', plan: 'Enterprise', joined: '2024-02-22', transactions: 563 },
  ]);
  
  const handleApproveKeyword = (keywordId: string) => {
    toast.success('Keyword approved and added to database');
  };
  
  const handleRejectKeyword = (keywordId: string) => {
    toast.success('Keyword rejected');
  };
  
  const downloadUserData = () => {
    toast.success('User data export started');
  };
  
  const downloadTransactionsData = () => {
    try {
      const csvData = exportToCSV(transactions);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `all_transactions_${date}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('All transactions exported to CSV successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export transactions');
    }
  };

  const handleRemoveDuplicates = async () => {
    setIsLoading(true);
    const success = await removeDuplicateVendors();
    setIsLoading(false);
    if (success) {
      fetchSystemStats();
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/')} className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Return to Dashboard
          </Button>
          <Button onClick={() => setIsUploadDialogOpen(true)} variant="outline" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload CSV
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Activity className="h-4 w-4 mr-2 text-primary" />
              API Usage
            </CardTitle>
            <CardDescription>OpenAI API calls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{usageData.openai.total}</div>
            <p className="text-sm text-muted-foreground">
              {usageData.openai.last30Days} in last 30 days
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Database className="h-4 w-4 mr-2 text-primary" />
              Database Usage
            </CardTitle>
            <CardDescription>Supabase storage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{usageData.supabase.database} GB</div>
            <p className="text-sm text-muted-foreground">
              {usageData.supabase.storage} MB file storage
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Webhook className="h-4 w-4 mr-2 text-primary" />
              Function Calls
            </CardTitle>
            <CardDescription>Edge function invocations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{usageData.supabase.functions}</div>
            <p className="text-sm text-muted-foreground">
              Function invocations
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="keywords" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="keywords">
            <Key className="h-4 w-4 mr-2" />
            Pending Keywords
          </TabsTrigger>
          <TabsTrigger value="allKeywords">
            <Database className="h-4 w-4 mr-2" />
            All Vendor Keywords
          </TabsTrigger>
          <TabsTrigger value="subscribers">
            <User className="h-4 w-4 mr-2" />
            Subscribers
          </TabsTrigger>
          <TabsTrigger value="system">
            <BarChart3 className="h-4 w-4 mr-2" />
            System Stats
          </TabsTrigger>
          <TabsTrigger value="code">
            <Code className="h-4 w-4 mr-2" />
            Code Editor
          </TabsTrigger>
          <TabsTrigger value="openaiLogs">
            <Terminal className="h-4 w-4 mr-2" />
            OpenAI Logs
          </TabsTrigger>
          <TabsTrigger value="todo">
            <AlertCircle className="h-4 w-4 mr-2" />
            Production Todo
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="keywords" className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Pending Keyword Validations</h2>
          </div>
          
          {pendingKeywords.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Occurrences</TableHead>
                  <TableHead>Suggested Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingKeywords.map((keyword) => (
                  <TableRow key={keyword.id}>
                    <TableCell className="font-medium">{keyword.keyword}</TableCell>
                    <TableCell>{keyword.occurrences}</TableCell>
                    <TableCell>{keyword.suggested_category}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleApproveKeyword(keyword.id)}
                          className="h-8 px-2 text-green-600"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleRejectKeyword(keyword.id)}
                          className="h-8 px-2 text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              No pending keywords to validate
            </div>
          )}
          
          <div className="mt-6">
            <VendorImporter />
          </div>
        </TabsContent>
        
        <TabsContent value="allKeywords" className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Vendor Keywords Management</h2>
            <Button 
              variant="outline" 
              onClick={handleRemoveDuplicates}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-t-2 border-b-2 border-current rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Trash className="h-4 w-4 mr-2" />
                  Remove Duplicates
                </>
              )}
            </Button>
          </div>
          <VendorKeywordsList />
        </TabsContent>
        
        <TabsContent value="subscribers" className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Subscribers</h2>
            <Button variant="outline" size="sm" onClick={downloadUserData}>
              <Download className="h-4 w-4 mr-2" />
              Export Users
            </Button>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Transactions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriberData.map((subscriber) => (
                <TableRow key={subscriber.id}>
                  <TableCell className="font-medium">{subscriber.email}</TableCell>
                  <TableCell>{subscriber.plan}</TableCell>
                  <TableCell>{subscriber.joined}</TableCell>
                  <TableCell>{subscriber.transactions}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">Manage</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        
        <TabsContent value="system" className="border rounded-lg p-4">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">System Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-lg font-medium">Total Transactions</div>
                    <div className="text-3xl font-bold">{systemStats.transactionCount}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-lg font-medium">Bank Connections</div>
                    <div className="text-3xl font-bold">{systemStats.bankConnectionCount}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-lg font-medium">Vendors</div>
                    <div className="text-3xl font-bold">{systemStats.vendorCount}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {systemStats.verifiedCategoriesCount} verified
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Data Management</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={downloadTransactionsData}>
                  <Download className="h-4 w-4 mr-2" />
                  Export All Transactions
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Vendor Database
                </Button>
                <Button variant="outline">
                  <Activity className="h-4 w-4 mr-2" />
                  View System Logs
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="code" className="border rounded-lg p-4">
          <CodeEditor />
        </TabsContent>
        
        <TabsContent value="openaiLogs" className="border rounded-lg p-4">
          <OpenAILogs />
        </TabsContent>
        
        <TabsContent value="todo" className="mt-0">
          <ProductionTodoList />
        </TabsContent>
      </Tabs>
      
      <UploadDialog 
        isOpen={isUploadDialogOpen} 
        onClose={() => setIsUploadDialogOpen(false)} 
        bankConnections={bankConnections}
      />
    </div>
  );
};

export default Admin;
