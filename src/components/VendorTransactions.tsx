import React, { useState } from 'react';
import { useBookkeeping } from '@/context/BookkeepingContext';
import TransactionTable from './TransactionTable';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  Store, 
  CheckCircle, 
  AlertTriangle,
  BadgeCheck,
  Plus,
  RefreshCw,
  Search
} from "lucide-react";
import { toast } from '@/utils/toast';
import { Transaction, VendorItem, Vendor } from '@/types';
import VendorEditor from './VendorEditor';
import VendorImporter from './VendorImporter';
import UnknownVendorsReview from './UnknownVendorsReview';

interface VendorTransactionsProps {
  transactions: Transaction[];
}

const VendorTransactions: React.FC<VendorTransactionsProps> = ({ transactions }) => {
  const { 
    getVendorsList, 
    verifyVendor, 
    categories, 
    vendors, 
    analyzeTransactionWithAI,
    findSimilarTransactions
  } = useBookkeeping();
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [isVendorEditorOpen, setIsVendorEditorOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  
  const vendorsList = getVendorsList();
  
  const handleVendorApproval = (vendorName: string, approved: boolean) => {
    verifyVendor(vendorName, approved);
    toast.success(`Vendor ${approved ? 'approved' : 'rejected'}`);
  };
  
  const handleAddVendor = async (newVendor: Vendor) => {
    if (vendors.some(v => v.name === newVendor.name)) {
      toast.error(`Vendor "${newVendor.name}" already exists`);
      return;
    }
    
    setProcessingAction(true);
    
    // Add the vendor to the database
    try {
      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newVendor),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add vendor');
      }
      
      const data = await response.json();
      
      toast.success(`Added new vendor: ${newVendor.name}`);
      setIsVendorEditorOpen(false);
      setSelectedVendor(newVendor.name);
      
      // Find similar transactions and assign vendor
      const similarTransactions = await findSimilarTransactions(newVendor.name, transactions);
      
      if (similarTransactions && similarTransactions.length > 0) {
        toast.success(`Found ${similarTransactions.length} similar transactions for vendor: ${newVendor.name}`);
      }
      
    } catch (err) {
      console.error('Error adding vendor:', err);
      toast.error('Failed to add vendor. Please try again.');
    } finally {
      setProcessingAction(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card className="border-[hsl(var(--border))] hover:shadow-md transition-all">
        <CardHeader>
          <CardTitle className="text-[hsl(var(--primary))] flex items-center gap-2">
            <Store className="h-5 w-5" />
            Vendor Analysis
          </CardTitle>
          <CardDescription>
            Select a vendor to view all their transactions or add a new vendor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <Select
              value={selectedVendor || undefined}
              onValueChange={setSelectedVendor}
            >
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Select a vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendorsList.map((vendor) => (
                  <SelectItem key={vendor.name} value={vendor.name}>
                    <div className="flex items-center gap-2">
                      <span>{vendor.name}</span>
                      <span className="text-xs text-muted-foreground">({vendor.count})</span>
                      {vendor.verified && (
                        <BadgeCheck className="h-4 w-4 text-[hsl(var(--finance-soft-green))]" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2 animate-fade-in">
              <Button
                size="sm"
                variant="outline"
                className="hover-scale"
                onClick={() => setIsVendorEditorOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Vendor
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                disabled={processingAction}
                className="hover-scale"
              >
                <Search className="h-4 w-4 mr-2" />
                Find Similar Transactions
                {processingAction && <RefreshCw className="ml-2 h-3 w-3 animate-spin" />}
              </Button>
            </div>
            
            {selectedVendor && (
              <div className="flex items-center gap-2 ml-auto animate-fade-in">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[hsl(var(--finance-soft-green))] border-[hsl(var(--finance-soft-green))] hover-scale"
                  onClick={() => handleVendorApproval(selectedVendor, true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Vendor
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[hsl(var(--finance-soft-red))] border-[hsl(var(--finance-soft-red))] hover-scale"
                  onClick={() => handleVendorApproval(selectedVendor, false)}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Reject Vendor
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <VendorImporter />
      
      <UnknownVendorsReview transactions={transactions.filter(t => !t.vendor || t.vendor === 'Unknown')} />
      
      {selectedVendor ? (
        <div className="animate-fade-in">
          <Card className="hover:shadow-md transition-all">
            <CardHeader>
              <CardTitle className="text-lg">Transactions for {selectedVendor}</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionTable filter="by_vendor" vendorName={selectedVendor} transactions={transactions} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground animate-fade-in">
          <Store className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50 animate-bounce-subtle" />
          <p>Select a vendor to view their transactions</p>
        </div>
      )}
      
      <VendorEditor
        onSave={handleAddVendor}
        isOpen={isVendorEditorOpen}
        onClose={() => setIsVendorEditorOpen(false)}
      />
    </div>
  );
};

export default VendorTransactions;
