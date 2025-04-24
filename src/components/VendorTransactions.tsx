import React, { useState, useEffect } from 'react';
import { useBookkeeping } from '@/context/BookkeepingContext';
import { Transaction, Vendor } from '@/types';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Store, Info, Settings } from "lucide-react";
import { toast } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import VendorEditor from './VendorEditor';
import VendorImporter from './VendorImporter';
import UnknownVendorsReview from './UnknownVendorsReview';
import VendorSelector from './vendor/VendorSelector';
import VendorTransactionsDisplay from './vendor/VendorTransactionsDisplay';
import { findSimilarVendorTransactions } from '@/services/vendorService';
import OnboardingQuestionnaire from './OnboardingQuestionnaire';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth';

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
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const { session } = useAuth();
  const [businessContext, setBusinessContext] = useState<any>(null);
  
  const vendorsList = getVendorsList();
  
  useEffect(() => {
    const fetchBusinessContext = async () => {
      if (session?.user) {
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('business_context')
            .eq('id', session.user.id)
            .single();
            
          if (error) {
            console.error('Error fetching business context:', error);
            return;
          }
          
          if (data && data.business_context) {
            setBusinessContext(data.business_context);
          } else {
            setTimeout(() => setIsQuestionnaireOpen(true), 1000);
          }
        } catch (err) {
          console.error('Error fetching business context:', err);
        }
      }
    };
    
    fetchBusinessContext();
  }, [session]);
  
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
      console.log('Setting selected vendor to:', newVendor.name);
      setIsVendorEditorOpen(false);
      setSelectedVendor(newVendor.name);
      
      await findSimilarVendorTransactions(newVendor.name, transactions, findSimilarTransactions);
      
    } catch (err) {
      console.error('Error processing after vendor add:', err);
      toast.error('Failed to process vendor data. Please try again.');
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
  
  const handleSaveBusinessContext = (data: any) => {
    setBusinessContext(data);
    toast.success('Business context saved successfully');
  };
  
  return (
    <div className="space-y-6">
      <Card className="border-[hsl(var(--border))] hover:shadow-md transition-all">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-[hsl(var(--primary))] flex items-center gap-2">
              <Store className="h-5 w-5" />
              Vendor Analysis
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsQuestionnaireOpen(true)}
              className="flex items-center gap-1"
            >
              <Settings className="h-4 w-4 mr-1" />
              Business Context
            </Button>
          </div>
          <CardDescription>
            Select a vendor to view all their transactions or add a new vendor
            {businessContext && (
              <div className="mt-1 flex items-center gap-1 text-xs">
                <Info className="h-3 w-3" />
                <span>Using business context from {businessContext.country || 'Unknown'} ({businessContext.industry || 'Unknown industry'})</span>
              </div>
            )}
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
        isProcessing={processingAction}
      />
      
      <OnboardingQuestionnaire
        isOpen={isQuestionnaireOpen}
        onClose={() => setIsQuestionnaireOpen(false)}
        onComplete={handleSaveBusinessContext}
        initialValues={businessContext}
      />
    </div>
  );
};

export default VendorTransactions;
