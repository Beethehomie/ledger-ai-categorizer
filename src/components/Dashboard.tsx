
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUpload from "./FileUpload";
import TransactionTable from "./TransactionTable";
import VendorTransactions from "./VendorTransactions";
import FinancialSummary from "./FinancialSummary";
import ChartSection from "./ChartSection";
import { useBookkeeping } from '@/context/BookkeepingContext';
import { Store } from "lucide-react";

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
      
      <div className="bg-card rounded-lg shadow-sm border border-finance-gray-light">
        <Tabs defaultValue="all">
          <div className="px-4 pt-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all" className="transition-all duration-200">All Transactions</TabsTrigger>
              <TabsTrigger value="unverified" className="relative transition-all duration-200">
                Unverified
                {unverifiedCount > 0 && (
                  <span className="absolute right-2 top-1 bg-finance-red text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unverifiedCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="pl" className="transition-all duration-200">P&L Transactions</TabsTrigger>
              <TabsTrigger value="bs" className="transition-all duration-200">Balance Sheet</TabsTrigger>
              <TabsTrigger value="vendors" className="transition-all duration-200">
                <Store className="h-4 w-4 mr-1" />
                By Vendor
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="all" className="m-0 p-4 animate-fade-in">
            <TransactionTable filter="all" />
          </TabsContent>
          
          <TabsContent value="unverified" className="m-0 p-4 animate-fade-in">
            <TransactionTable filter="unverified" />
          </TabsContent>
          
          <TabsContent value="pl" className="m-0 p-4 animate-fade-in">
            <TransactionTable filter="profit_loss" />
          </TabsContent>
          
          <TabsContent value="bs" className="m-0 p-4 animate-fade-in">
            <TransactionTable filter="balance_sheet" />
          </TabsContent>
          
          <TabsContent value="vendors" className="m-0 p-4 animate-fade-in">
            <VendorTransactions />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
