
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUpload from "./FileUpload";
import TransactionTable from "./TransactionTable";
import VendorTransactions from "./VendorTransactions";
import FinancialSummary from "./FinancialSummary";
import ChartSection from "./ChartSection";
import { useBookkeeping } from '@/context/BookkeepingContext';
import { Store, FileText, PieChart, AlertCircle, BarChart3 } from "lucide-react";

const Dashboard: React.FC = () => {
  const { transactions } = useBookkeeping();
  const unverifiedCount = transactions.filter(t => !t.isVerified).length;
  
  return (
    <div className="space-y-6">
      <FinancialSummary />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <FileUpload />
        </div>
        
        <div className="lg:col-span-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <ChartSection />
        </div>
      </div>
      
      <div className="bg-card rounded-lg shadow-sm border border-finance-gray-light animate-fade-in hover:shadow-md transition-all" style={{ animationDelay: '0.5s' }}>
        <Tabs defaultValue="all">
          <div className="px-4 pt-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all" className="transition-all duration-200">
                <FileText className="h-4 w-4 mr-1" />
                All
              </TabsTrigger>
              <TabsTrigger value="unverified" className="relative transition-all duration-200">
                <AlertCircle className="h-4 w-4 mr-1" />
                Unverified
                {unverifiedCount > 0 && (
                  <span className="absolute -right-1 -top-1 bg-finance-red text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {unverifiedCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="pl" className="transition-all duration-200">
                <PieChart className="h-4 w-4 mr-1" />
                P&L
              </TabsTrigger>
              <TabsTrigger value="bs" className="transition-all duration-200">
                <BarChart3 className="h-4 w-4 mr-1" />
                Balance Sheet
              </TabsTrigger>
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
