
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, DollarSign, PiggyBank, LineChart } from "lucide-react";
import { useBookkeeping } from '@/context/BookkeepingContext';

const FinancialSummary: React.FC = () => {
  const { financialSummary } = useBookkeeping();
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Income
          </CardTitle>
          <DollarSign className="h-4 w-4 text-finance-green" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-finance-green">
            {formatCurrency(financialSummary.totalIncome)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Revenue & other income
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Expenses
          </CardTitle>
          <ArrowDownRight className="h-4 w-4 text-finance-red" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-finance-red">
            {formatCurrency(financialSummary.totalExpenses)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            All outgoing expenses
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Net Profit
          </CardTitle>
          <LineChart className="h-4 w-4 text-finance-blue" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            financialSummary.netProfit >= 0 ? 'text-finance-green' : 'text-finance-red'
          }`}>
            {formatCurrency(financialSummary.netProfit)}
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
