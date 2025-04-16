
import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import TransactionTable from './TransactionTable';
import { useBookkeeping } from '@/context/BookkeepingContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const TransactionReviewPage = () => {
  const { transactions, loading } = useBookkeeping();
  const [lowConfidenceCount, setLowConfidenceCount] = useState(0);
  
  useEffect(() => {
    // Count transactions with low confidence scores
    const count = transactions.filter(t => 
      t.confidenceScore !== undefined && 
      t.confidenceScore < 0.5 && 
      !t.isVerified
    ).length;
    
    setLowConfidenceCount(count);
  }, [transactions]);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
            Transactions Requiring Review
          </CardTitle>
          <CardDescription>
            Review and approve categorizations for transactions where AI confidence is low or patterns are unclear
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <>
              {lowConfidenceCount === 0 ? (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-700">
                    No transactions require your review at this time. All transactions have been categorized with high confidence.
                  </AlertDescription>
                </Alert>
              ) : (
                <Tabs defaultValue="pending">
                  <TabsList className="mb-4">
                    <TabsTrigger value="pending">
                      Needs Review ({lowConfidenceCount})
                    </TabsTrigger>
                    <TabsTrigger value="verified">
                      Verified
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="pending">
                    <Alert className="mb-4">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        These transactions have been categorized by AI with low confidence (<50%) and need your review.
                        Selecting a category will verify the transaction and help train the system for future categorizations.
                      </AlertDescription>
                    </Alert>
                    
                    <TransactionTable 
                      filter="review" 
                      transactions={transactions} 
                    />
                  </TabsContent>
                  
                  <TabsContent value="verified">
                    <TransactionTable 
                      filter="all" 
                      transactions={transactions.filter(t => t.isVerified)} 
                    />
                  </TabsContent>
                </Tabs>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionReviewPage;
