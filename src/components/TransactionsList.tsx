
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useTransactionsQuery } from '@/hooks/use-transactions-query';
import { Transaction } from '@/types';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { TransactionRow } from './TransactionRow';

export const TransactionsList = () => {
  const { data: transactions, isLoading, error, refetch } = useTransactionsQuery();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>Loading your transactions...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>Error loading transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border border-red-200 rounded bg-red-50 text-red-700 flex items-center">
            <XCircle className="h-5 w-5 mr-2" />
            <span>Failed to load transactions. Please try again.</span>
          </div>
          <Button onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>No transactions found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border border-yellow-200 rounded bg-yellow-50 text-yellow-700 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>You don't have any transactions yet. Upload a CSV to get started!</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>
          {transactions.length} transactions loaded
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.slice(0, 10).map((transaction) => (
                <TransactionRow 
                  key={transaction.id} 
                  transaction={transaction}
                  onClick={() => setSelectedTransaction(transaction)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-4 text-center">
          <Button variant="outline" size="sm">
            View All Transactions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
