import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, DollarSign, PiggyBank, LineChart, Coins } from "lucide-react";
import { useBookkeeping } from '@/context/BookkeepingContext';
import { useSettings } from '@/context/SettingsContext';
import { formatCurrency } from '@/utils/currencyUtils';
import { FinancialSummaryProps } from '@/types';

const FinancialSummary: React.FC<FinancialSummaryProps> = ({ refreshing }) => {
  const { financialSummary } = useBookkeeping();
  const { currency } = useSettings();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
      <Card className="border-[hsl(var(--border))] hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Income
          </CardTitle>
          <DollarSign className="h-4 w-4 text-[hsl(var(--finance-soft-green))]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[hsl(var(--finance-soft-green))]">
            {formatCurrency(financialSummary.totalIncome, currency)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Revenue & other income
          </p>
        </CardContent>
      </Card>
      
      <Card className="border-[hsl(var(--border))] hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Expenses
          </CardTitle>
          <ArrowDownRight className="h-4 w-4 text-[hsl(var(--finance-soft-red))]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[hsl(var(--finance-soft-red))]">
            {formatCurrency(financialSummary.totalExpenses, currency)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            All outgoing expenses
          </p>
        </CardContent>
      </Card>
      
      <Card className="border-[hsl(var(--border))] hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Cash Balance
          </CardTitle>
          <Coins className="h-4 w-4 text-[hsl(var(--finance-beige))]" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            financialSummary.cashBalance >= 0 ? 'text-[hsl(var(--finance-soft-green))]' : 'text-[hsl(var(--finance-soft-red))]'
          }`}>
            {formatCurrency(financialSummary.cashBalance, currency)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Available cash
          </p>
        </CardContent>
      </Card>
      
      <Card className="border-[hsl(var(--border))] hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Net Profit
          </CardTitle>
          <LineChart className="h-4 w-4 text-[hsl(var(--finance-beige))]" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            financialSummary.netProfit >= 0 ? 'text-[hsl(var(--finance-soft-green))]' : 'text-[hsl(var(--finance-soft-red))]'
          }`}>
            {formatCurrency(financialSummary.netProfit, currency)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Income minus expenses
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialSummary;
