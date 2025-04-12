
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
  Plus
} from "lucide-react";
import { toast } from '@/utils/toast';
import { Transaction } from '@/types';
import VendorEditor from './VendorEditor';
import VendorImporter from './VendorImporter';

interface VendorTransactionsProps {
  transactions: Transaction[];
}

const VendorTransactions: React.FC<VendorTransactionsProps> = ({ transactions }) => {
  const { getVendorsList, verifyVendor, categories } = useBookkeeping();
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [isVendorEditorOpen, setIsVendorEditorOpen] = useState(false);
  
  const vendorsList = getVendorsList();
  
  const handleVendorApproval = (vendorName: string, approved: boolean) => {
    verifyVendor(vendorName, approved);
    toast.success(`Vendor ${approved ? 'approved' : 'rejected'}`);
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
        categories={categories}
        onSave={(vendor) => {
          toast.success(`Added new vendor: ${vendor.name}`);
          setIsVendorEditorOpen(false);
        }}
        isOpen={isVendorEditorOpen}
        onClose={() => setIsVendorEditorOpen(false)}
      />
    </div>
  );
};

export default VendorTransactions;
