import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TransactionTable from "./TransactionTable";
import VendorTransactions from "./VendorTransactions";
import FinancialSummary from "./FinancialSummary";
import ChartSection from "./ChartSection";
import { useBookkeeping } from '@/context/BookkeepingContext';
import { useSettings } from '@/context/SettingsContext';
import DateRangeSelector from './DateRangeSelector';
import CurrencySelector from './CurrencySelector';
import { Store, FileText, PieChart, AlertCircle, BarChart3, User, DollarSign, Target, Edit, Upload, Download, RefreshCw } from "lucide-react";
import { Button } from '@/components/ui/button';
import GoalEditor from './GoalEditor';
import UploadDialog from './UploadDialog';
import ReportExporter from './ReportExporter';
import { toast } from '@/utils/toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from '@/integrations/supabase/client';
import Select from 'react-select';

interface RefreshableComponentProps {
  refreshing?: boolean;
}

declare module "@/components/FinancialSummary" {
  interface FinancialSummaryProps extends RefreshableComponentProps {}
}

declare module "@/components/ChartSection" {
  interface ChartSectionProps extends RefreshableComponentProps {}
}

const Dashboard: React.FC = () => {
  const { 
    transactions, 
    filterTransactionsByDate, 
    bankConnections,
    loading: dataLoading,
    calculateFinancialSummary,
    fetchTransactions,
    financialSummary
  } = useBookkeeping();
  
  const { 
    currency, 
    setCurrency, 
    dateRange, 
    setDateRange,
    financialGoal,
    updateFinancialGoal
  } = useSettings();
  
  const [isGoalEditorOpen, setIsGoalEditorOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [filteredTransactions, setFilteredTransactions] = useState(transactions);
  const [refreshing, setRefreshing] = useState(false);
  const [goalProgressSource, setGoalProgressSource] = useState<'income' | 'balance'>('balance');
  
  useEffect(() => {
    setFilteredTransactions(
      filterTransactionsByDate(dateRange.startDate, dateRange.endDate)
    );
  }, [dateRange, transactions, filterTransactionsByDate]);
  
  useEffect(() => {
    calculateFinancialSummary();
  }, [transactions, calculateFinancialSummary]);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    toast.success('Refreshing data...');
    
    try {
      await fetchTransactions();
      calculateFinancialSummary();
      
      toast.success('Data successfully refreshed');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };
  
  const calculateGoalProgressAmount = () => {
    if (goalProgressSource === 'income') {
      return financialSummary?.income || 0;
    } else {
      return financialSummary?.cashBalance || 0;
    }
  };
  
  const currentAmount = calculateGoalProgressAmount();
  
  useEffect(() => {
    if (currentAmount !== financialGoal.currentAmount) {
      updateFinancialGoal({
        ...financialGoal,
        currentAmount
      });
    }
  }, [currentAmount, goalProgressSource]);
  
  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <DateRangeSelector 
            startDate={dateRange.startDate} 
            endDate={dateRange.endDate} 
            onRangeChange={setDateRange} 
          />
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing || dataLoading}
                  className="flex items-center gap-2 hover-scale"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh all transactions and reports</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsUploadDialogOpen(true)}
                  className="flex items-center gap-2 hover-scale"
                >
                  <Upload className="h-4 w-4" />
                  Upload CSV
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Upload transaction data from CSV file</p>
              </TooltipContent>
            </Tooltip>
            
            <CurrencySelector value={currency} onChange={setCurrency} />
          </div>
        </div>
        
        <FinancialSummary refreshing={refreshing} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="mt-0 bg-[hsl(var(--finance-nude-gray))] rounded-lg p-6 border border-[hsl(var(--border))] shadow-sm animate-fade-in hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <User className="h-8 w-8 mr-3 p-1.5 rounded-full bg-[hsl(var(--primary))] text-white" />
                  <div>
                    <h3 className="font-medium text-[hsl(var(--finance-nude-dark))]">Financial Goal Progress</h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      {financialGoal.name}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={goalProgressSource} onValueChange={(val: 'income' | 'balance') => setGoalProgressSource(val)}>
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="balance">Cash Balance</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setIsGoalEditorOpen(true)}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit financial goal</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">
                  {goalProgressSource === 'income' ? 'Income' : 'Cash Balance'}: {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: currency
                  }).format(currentAmount)}
                </span>
                <span className="text-sm text-[hsl(var(--muted-foreground))]">
                  Goal: {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: currency
                  }).format(financialGoal.targetAmount)}
                </span>
              </div>
              
              <div className="relative h-64 progress-container">
                <div className="goal-marker" style={{ bottom: '80%' }}>
                  <div className="absolute -right-16 -top-4 flex items-center animate-pulse">
                    <Target className="h-4 w-4 text-[hsl(var(--finance-soft-red))]" />
                    <span className="text-xs text-[hsl(var(--finance-soft-red))]">Milestone</span>
                  </div>
                </div>
                
                <div 
                  className="progress-fill animate-fill-up" 
                  style={{ 
                    '--fill-height': `${Math.min(currentAmount / financialGoal.targetAmount * 100, 100)}%`,
                    background: 'linear-gradient(180deg, hsl(var(--finance-beige)) 0%, hsl(var(--primary)) 100%)'
                  } as React.CSSProperties}
                ></div>
                
                <div 
                  className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce-subtle"
                  style={{ bottom: `${Math.min(currentAmount / financialGoal.targetAmount * 100, 100)}%` }}
                >
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[hsl(var(--finance-nude-dark))] text-white text-xs px-2 py-1 rounded">
                      {(currentAmount / financialGoal.targetAmount * 100).toFixed(0)}% Complete
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <ChartSection refreshing={refreshing} />
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <ReportExporter transactions={filteredTransactions} currency={currency} />
        </div>
        
        <UploadDialog 
          isOpen={isUploadDialogOpen}
          onClose={() => setIsUploadDialogOpen(false)}
          bankConnections={bankConnections}
        />
        
        <GoalEditor
          goal={financialGoal}
          currency={currency}
          onSave={updateFinancialGoal}
          isOpen={isGoalEditorOpen}
          onClose={() => setIsGoalEditorOpen(false)}
        />
      </div>
    </TooltipProvider>
  );
};

export default Dashboard;
