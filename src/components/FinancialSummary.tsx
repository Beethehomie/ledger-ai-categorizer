
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, ArrowDownCircle, PieChart } from "lucide-react";
import { useTransactionsQuery } from '@/hooks/use-transactions-query';

export const FinancialSummary = () => {
  const { data: transactions, isLoading } = useTransactionsQuery();

  // Calculate summary statistics
  const calculateSummary = () => {
    if (!transactions) return { income: 0, expenses: 0, net: 0, uncategorized: 0 };

    let income = 0;
    let expenses = 0;
    let uncategorized = 0;

    transactions.forEach(tx => {
      if (!tx.type || !tx.vendor) {
        uncategorized++;
        return;
      }

      if (tx.type === 'income') {
        income += Math.abs(tx.amount);
      } else if (tx.type === 'expense') {
        expenses += Math.abs(tx.amount);
      }
    });

    return {
      income,
      expenses,
      net: income - expenses,
      uncategorized
    };
  };

  const summary = calculateSummary();

  // Format currency values
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Summary</CardTitle>
        <CardDescription>Overview of your financial status</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="animate-pulse">Loading summary data...</div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <ArrowUpCircle className="text-green-600 dark:text-green-400 h-5 w-5" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-300">Income</span>
                </div>
                <p className="text-2xl font-bold mt-2 text-green-700 dark:text-green-400">
                  {formatCurrency(summary.income)}
                </p>
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <ArrowDownCircle className="text-red-600 dark:text-red-400 h-5 w-5" />
                  <span className="text-sm font-medium text-red-800 dark:text-red-300">Expenses</span>
                </div>
                <p className="text-2xl font-bold mt-2 text-red-700 dark:text-red-400">
                  {formatCurrency(summary.expenses)}
                </p>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Net Income</p>
                  <p className={`text-2xl font-bold mt-1 ${
                    summary.net >= 0 
                      ? 'text-green-700 dark:text-green-400' 
                      : 'text-red-700 dark:text-red-400'
                  }`}>
                    {formatCurrency(summary.net)}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Uncategorized</p>
                  <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                    {summary.uncategorized}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center"
                size="sm"
              >
                <PieChart className="h-4 w-4 mr-2" />
                View Detailed Reports
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
