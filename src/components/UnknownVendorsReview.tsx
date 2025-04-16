
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check, Store } from "lucide-react";
import { useBookkeeping } from '@/context/BookkeepingContext';
import { useSettings } from '@/context/SettingsContext';
import { formatCurrency } from '@/utils/currencyUtils';
import { toast } from '@/utils/toast';
import { Transaction } from '@/types';

const UnknownVendorsReview: React.FC = () => {
  const { transactions, updateTransaction } = useBookkeeping();
  const { currency } = useSettings();
  const [vendorNames, setVendorNames] = useState<{[key: string]: string}>({});
  
  // Filter transactions with Unknown vendors
  const unknownVendorTransactions = transactions.filter(t => 
    t.vendor === "Unknown" || !t.vendor
  );
  
  // Group transactions by description to handle similar descriptions together
  const groupedByDescription = unknownVendorTransactions.reduce<{[key: string]: Transaction[]}>(
    (acc, transaction) => {
      const key = transaction.description.toLowerCase().trim();
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(transaction);
      return acc;
    },
    {}
  );
  
  // Sort groups by number of transactions (most frequent first)
  const sortedGroups = Object.entries(groupedByDescription)
    .sort((a, b) => b[1].length - a[1].length);
  
  const handleVendorNameChange = (description: string, vendorName: string) => {
    setVendorNames({
      ...vendorNames,
      [description]: vendorName
    });
  };
  
  const assignVendor = async (description: string, transactions: Transaction[]) => {
    const vendorName = vendorNames[description];
    if (!vendorName || vendorName.trim() === '') {
      toast.error('Please enter a vendor name');
      return;
    }
    
    try {
      // Update all transactions with this description
      for (const transaction of transactions) {
        await updateTransaction({
          ...transaction,
          vendor: vendorName,
          vendorVerified: true
        });
      }
      
      toast.success(`Assigned "${vendorName}" to ${transactions.length} transactions`);
      
      // Clear the input field
      setVendorNames({
        ...vendorNames,
        [description]: ''
      });
    } catch (error) {
      console.error('Error assigning vendor:', error);
      toast.error('Failed to update transactions');
    }
  };
  
  if (unknownVendorTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unknown Vendors Review</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-6">
            No transactions with unknown vendors found.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="text-amber-500 h-5 w-5" />
          Unknown Vendors Review
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({unknownVendorTransactions.length} transactions with unknown vendors)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50%]">Description</TableHead>
              <TableHead>Count</TableHead>
              <TableHead>Amount (Example)</TableHead>
              <TableHead>Assign Vendor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedGroups.slice(0, 10).map(([description, transactions]) => (
              <TableRow key={description}>
                <TableCell className="font-medium">{description}</TableCell>
                <TableCell>{transactions.length}</TableCell>
                <TableCell>
                  {formatCurrency(transactions[0].amount, currency)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        value={vendorNames[description] || ''}
                        onChange={(e) => handleVendorNameChange(description, e.target.value)}
                        placeholder="Enter vendor name"
                        className="h-8"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => assignVendor(description, transactions)}
                      className="h-8"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Assign
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {sortedGroups.length > 10 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {sortedGroups.length - 10} more groups with unknown vendors
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default UnknownVendorsReview;
