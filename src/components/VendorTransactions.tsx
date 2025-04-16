
import React, { useState } from 'react';
import { useBookkeeping } from '@/context/BookkeepingContext';
import { Transaction, Vendor } from '@/types';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Store } from "lucide-react";
import { toast } from '@/utils/toast';
import VendorEditor from './VendorEditor';
import VendorImporter from './VendorImporter';
import UnknownVendorsReview from './UnknownVendorsReview';
import VendorSelector from './vendor/VendorSelector';
import VendorTransactionsDisplay from './vendor/VendorTransactionsDisplay';
import { addVendor, findSimilarVendorTransactions } from '@/services/vendorService';

interface VendorTransactionsProps {
  transactions: Transaction[];
}

const VendorTransactions: React.FC<VendorTransactionsProps> = ({ transactions }) => {
  const { 
    getVendorsList, 
    verifyVendor, 
    vendors, 
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
    
    try {
      const result = await addVendor(newVendor);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to add vendor');
      }
      
      toast.success(`Added new vendor: ${newVendor.name}`);
      setIsVendorEditorOpen(false);
      setSelectedVendor(newVendor.name);
      
      // Find similar transactions and assign vendor
      await findSimilarVendorTransactions(newVendor.name, transactions, findSimilarTransactions);
      
    } catch (err) {
      console.error('Error adding vendor:', err);
      toast.error('Failed to add vendor. Please try again.');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleFindSimilarClick = async () => {
    if (!selectedVendor) {
      toast.error('Please select a vendor first');
      return;
    }
    
    setProcessingAction(true);
    try {
      await findSimilarVendorTransactions(selectedVendor, transactions, findSimilarTransactions);
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
          <VendorSelector
            selectedVendor={selectedVendor}
            setSelectedVendor={setSelectedVendor}
            vendorsList={vendorsList}
            onAddVendorClick={() => setIsVendorEditorOpen(true)}
            onFindSimilarClick={handleFindSimilarClick}
            onVendorApproval={handleVendorApproval}
            processingAction={processingAction}
          />
        </CardContent>
      </Card>
      
      <VendorImporter />
      
      <UnknownVendorsReview transactions={transactions.filter(t => !t.vendor || t.vendor === 'Unknown')} />
      
      <VendorTransactionsDisplay 
        selectedVendor={selectedVendor} 
        transactions={transactions} 
      />
      
      <VendorEditor
        onSave={handleAddVendor}
        isOpen={isVendorEditorOpen}
        onClose={() => setIsVendorEditorOpen(false)}
      />
    </div>
  );
};

export default VendorTransactions;
