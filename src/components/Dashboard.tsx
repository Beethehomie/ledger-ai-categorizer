
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUpload from "./FileUpload";
import TransactionTable from "./TransactionTable";
import FinancialSummary from "./FinancialSummary";
import ChartSection from "./ChartSection";
import { useBookkeeping } from '@/context/BookkeepingContext';

const Dashboard: React.FC = () => {
  const { transactions } = useBookkeeping();
  const unverifiedCount = transactions.filter(t => !t.isVerified).length;
  
  return (
    <div className="space-y-6">
      <FinancialSummary />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <FileUpload />
        </div>
        
        <div className="lg:col-span-2">
          <ChartSection />
        </div>
      </div>
      
      <div className="bg-card rounded-lg shadow-sm border">
        <Tabs defaultValue="all">
          <div className="px-4 pt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Transactions</TabsTrigger>
              <TabsTrigger value="unverified" className="relative">
                Unverified
                {unverifiedCount > 0 && (
                  <span className="absolute right-2 top-1 bg-finance-red text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unverifiedCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="pl">P&L Transactions</TabsTrigger>
              <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="all" className="m-0 p-4">
            <TransactionTable filter="all" />
          </TabsContent>
          
          <TabsContent value="unverified" className="m-0 p-4">
            <TransactionTable filter="unverified" />
          </TabsContent>
          
          <TabsContent value="pl" className="m-0 p-4">
            <TransactionTable filter="profit_loss" />
          </TabsContent>
          
          <TabsContent value="bs" className="m-0 p-4">
            <TransactionTable filter="balance_sheet" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
