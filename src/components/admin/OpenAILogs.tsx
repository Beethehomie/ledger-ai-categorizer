
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Search, Filter, BarChart, AlertTriangle, Check, RefreshCw } from 'lucide-react';

// Mock data for demonstration
const mockLogs = [
  {
    id: "1",
    timestamp: "2025-04-16T10:32:15Z",
    model: "gpt-4o",
    tokens: 1243,
    cost: 0.0248,
    status: "success",
    endpoint: "chat/completions",
    user: "user1@example.com",
    promptPreview: "Analyze this transaction from Walmart: $123.45 for groceries...",
  },
  {
    id: "2",
    timestamp: "2025-04-16T09:45:23Z",
    model: "gpt-4o",
    tokens: 2156,
    cost: 0.0431,
    status: "success",
    endpoint: "chat/completions",
    user: "user2@example.com",
    promptPreview: "Categorize the following transactions: 1. Amazon $34.99, 2. Starbucks $5.75...",
  },
  {
    id: "3",
    timestamp: "2025-04-15T16:22:47Z",
    model: "gpt-4o",
    tokens: 987,
    cost: 0.0197,
    status: "error",
    endpoint: "chat/completions",
    user: "user3@example.com",
    promptPreview: "Generate a monthly report for my transactions...",
  },
  {
    id: "4",
    timestamp: "2025-04-15T14:11:32Z",
    model: "gpt-4o",
    tokens: 1578,
    cost: 0.0315,
    status: "success",
    endpoint: "chat/completions",
    user: "user1@example.com",
    promptPreview: "Summarize my spending patterns for April 2025...",
  },
  {
    id: "5",
    timestamp: "2025-04-14T11:05:19Z",
    model: "gpt-4o",
    tokens: 632,
    cost: 0.0126,
    status: "success",
    endpoint: "chat/completions",
    user: "user4@example.com",
    promptPreview: "What category should I use for a payment to City Hall?",
  },
];

const OpenAILogs: React.FC = () => {
  const [logs, setLogs] = useState(mockLogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const dailyCost = logs.reduce((sum, log) => sum + log.cost, 0).toFixed(2);
  const totalTokens = logs.reduce((sum, log) => sum + log.tokens, 0).toLocaleString();
  const successRate = ((logs.filter(log => log.status === 'success').length / logs.length) * 100).toFixed(1);

  const handleRefresh = () => {
    setIsLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      setIsLoading(false);
      // In a real app, this would fetch fresh data from your backend
    }, 1500);
  };

  const handleExport = () => {
    // In a real app, this would generate and download a CSV file
    const csv = [
      ['ID', 'Timestamp', 'Model', 'Tokens', 'Cost', 'Status', 'Endpoint', 'User', 'Prompt Preview'].join(','),
      ...logs.map(log => [
        log.id,
        log.timestamp,
        log.model,
        log.tokens,
        log.cost,
        log.status,
        log.endpoint,
        log.user,
        `"${log.promptPreview.replace(/"/g, '""')}"` // Escape quotes in CSV
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'openai-logs.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const filteredLogs = logs.filter(log => 
    log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.promptPreview.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.endpoint.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">OpenAI API Logs</h2>
          <p className="text-muted-foreground">Monitor API usage, costs, and performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Daily Cost</p>
                <p className="text-2xl font-bold">${dailyCost}</p>
              </div>
              <BarChart className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tokens</p>
                <p className="text-2xl font-bold">{totalTokens}</p>
              </div>
              <Filter className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{successRate}%</p>
              </div>
              <Check className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Logs</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="high-cost">High Cost</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[250px]">Prompt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {formatDate(log.timestamp)}
                    </TableCell>
                    <TableCell>{log.user}</TableCell>
                    <TableCell>{log.model}</TableCell>
                    <TableCell>{log.tokens.toLocaleString()}</TableCell>
                    <TableCell>${log.cost.toFixed(4)}</TableCell>
                    <TableCell>
                      {log.status === 'success' ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Success
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Error
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="truncate max-w-[250px]">
                      {log.promptPreview}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6">
                    <div className="flex flex-col items-center">
                      <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No logs found</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
        
        {/* Similar tables for other tabs would go here */}
        <TabsContent value="errors">
          {/* Similar table structure with filtered data */}
        </TabsContent>
        <TabsContent value="high-cost">
          {/* Similar table structure with filtered data */}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OpenAILogs;
