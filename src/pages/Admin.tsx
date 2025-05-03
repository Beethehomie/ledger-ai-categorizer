
import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useBookkeeping } from '@/context/BookkeepingContext';
import { Transaction } from '@/types';
import { formatCurrency } from '@/utils/currencyUtils';
import { exportToCSV } from '@/utils/csvParser';

const Admin = () => {
  const { transactions, fetchTransactions } = useBookkeeping();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true);
      try {
        await fetchTransactions();
        setAllTransactions(transactions);
      } catch (error) {
        console.error("Error loading transactions:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load transactions.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [fetchTransactions, transactions, toast]);

  const exportAllTransactionsToCSV = () => {
    try {
      const csvData = exportToCSV(allTransactions);
      
      if (!csvData) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to generate CSV data"
        });
        return;
      }
      
      // Create a blob and download link
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      // Set up download
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `all_transactions_${date}.csv`);
      link.style.visibility = 'hidden';
      
      // Append to document, trigger download and clean up
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting all transactions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to export all transactions"
      });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-semibold mb-5">Admin Dashboard</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>
            Manage and export all transactions in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading transactions...</p>
          ) : (
            <>
              <div className="mb-4">
                <Button onClick={exportAllTransactionsToCSV}>
                  Export All Transactions to CSV
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Vendor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.date}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{formatCurrency(transaction.amount, 'USD')}</TableCell>
                      <TableCell>{transaction.category || "N/A"}</TableCell>
                      <TableCell>{transaction.vendor || "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
