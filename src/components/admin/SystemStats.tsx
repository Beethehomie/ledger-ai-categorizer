
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Download, Database, Server, Activity } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface SystemStatsData {
  databaseSize: number;
  tableInfo: {
    tableName: string;
    rowCount: number;
    size: string;
  }[];
  apiUsageDaily: {
    date: string;
    count: number;
  }[];
  systemHealth: {
    cpuUsage: number;
    memoryUsage: number;
    storageUsage: number;
    lastBackup: string;
    apiAvailability: number;
  };
}

export const SystemStats: React.FC = () => {
  const [stats, setStats] = useState<SystemStatsData>({
    databaseSize: 0,
    tableInfo: [],
    apiUsageDaily: [],
    systemHealth: {
      cpuUsage: 0,
      memoryUsage: 0,
      storageUsage: 0,
      lastBackup: '',
      apiAvailability: 100,
    }
  });
  
  const [isLoading, setIsLoading] = useState(false);
  
  const fetchSystemStats = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would fetch from a Supabase function
      // For now, using mock data
      
      // Mock API usage data
      const now = new Date();
      const apiUsageDaily = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(now.getDate() - (29 - i));
        return {
          date: date.toISOString().split('T')[0],
          count: Math.floor(Math.random() * 50) + 10
        };
      });
      
      setStats({
        databaseSize: 128.45,
        tableInfo: [
          { tableName: 'bank_transactions', rowCount: 4521, size: '45.2 MB' },
          { tableName: 'vendor_categorizations', rowCount: 865, size: '12.8 MB' },
          { tableName: 'user_profiles', rowCount: 38, size: '0.5 MB' },
          { tableName: 'bank_connections', rowCount: 72, size: '1.2 MB' },
        ],
        apiUsageDaily,
        systemHealth: {
          cpuUsage: 23,
          memoryUsage: 42,
          storageUsage: 18,
          lastBackup: new Date().toISOString(),
          apiAvailability: 99.98,
        }
      });
      
      toast.success('System stats refreshed');
    } catch (err: any) {
      console.error('Error fetching system stats:', err);
      toast.error('Failed to refresh system stats');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchSystemStats();
  }, []);
  
  const exportStatsData = () => {
    try {
      const dataStr = JSON.stringify(stats, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `system_stats_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success('Stats exported successfully');
    } catch (error) {
      toast.error('Failed to export stats');
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">System Statistics</h2>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchSystemStats}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {isLoading ? 'Refreshing...' : 'Refresh Stats'}
          </Button>
          
          <Button
            variant="outline"
            onClick={exportStatsData}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Stats
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Server className="h-4 w-4 mr-2 text-primary" />
              CPU Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.systemHealth.cpuUsage}%</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Server className="h-4 w-4 mr-2 text-primary" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.systemHealth.memoryUsage}%</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Database className="h-4 w-4 mr-2 text-primary" />
              Storage Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.systemHealth.storageUsage}%</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Activity className="h-4 w-4 mr-2 text-primary" />
              API Availability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.systemHealth.apiAvailability}%</div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            API Usage (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={stats.apiUsageDaily}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="API Calls"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Database Tables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table Name</TableHead>
                <TableHead>Row Count</TableHead>
                <TableHead>Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.tableInfo.map((table) => (
                <TableRow key={table.tableName}>
                  <TableCell className="font-medium">{table.tableName}</TableCell>
                  <TableCell>{table.rowCount.toLocaleString()}</TableCell>
                  <TableCell>{table.size}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <div className="mt-4 text-sm text-muted-foreground">
            Total database size: <strong>{stats.databaseSize} MB</strong>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Server className="h-5 w-5 mr-2" />
            System Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Last Database Backup</p>
              <p>{new Date(stats.systemHealth.lastBackup).toLocaleString()}</p>
            </div>
            
            <div className="flex gap-4">
              <Button variant="outline">
                Create Backup
              </Button>
              <Button variant="outline">
                Clear Logs
              </Button>
              <Button variant="outline">
                Optimize Database
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
