
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
  BadgeCheck
} from "lucide-react";
import { toast } from '@/utils/toast';
import { cn } from '@/lib/utils';

const VendorTransactions: React.FC = () => {
  const { getVendorsList, verifyVendor } = useBookkeeping();
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  
  const vendorsList = getVendorsList();
  
  const handleVendorApproval = (vendorName: string, approved: boolean) => {
    verifyVendor(vendorName, approved);
    toast.success(`Vendor ${approved ? 'approved' : 'rejected'}`);
  };
  
  return (
    <div className="space-y-6">
      <Card className="border-finance-gray-light">
        <CardHeader>
          <CardTitle className="text-finance-blue flex items-center gap-2">
            <Store className="h-5 w-5" />
            Vendor Analysis
          </CardTitle>
          <CardDescription>
            Select a vendor to view all their transactions
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
                        <BadgeCheck className="h-4 w-4 text-finance-green" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedVendor && (
              <div className="flex items-center gap-2 animate-fade-in">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-finance-green border-finance-green"
                  onClick={() => handleVendorApproval(selectedVendor, true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Vendor
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-finance-red border-finance-red"
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
      
      {selectedVendor ? (
        <div className="animate-fade-in">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transactions for {selectedVendor}</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionTable filter="by_vendor" vendorName={selectedVendor} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground animate-fade-in">
          <Store className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p>Select a vendor to view their transactions</p>
        </div>
      )}
    </div>
  );
};

export default VendorTransactions;
