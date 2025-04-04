
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBookkeeping } from '@/context/BookkeepingContext';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const ChartSection: React.FC = () => {
  const { transactions, categories, financialSummary } = useBookkeeping();
  
  // Only consider verified transactions
  const verifiedTransactions = transactions.filter(t => t.isVerified);
  
  // Prepare data for expense breakdown pie chart
  const expenseCategories = categories.filter(c => c.type === 'expense');
  const expenseData = expenseCategories.map(category => {
    const amount = verifiedTransactions
      .filter(t => t.category === category.name && t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    return {
      name: category.name,
      value: amount
    };
  }).filter(item => item.value > 0);
  
  // Prepare data for income breakdown pie chart
  const incomeCategories = categories.filter(c => c.type === 'income');
  const incomeData = incomeCategories.map(category => {
    const amount = verifiedTransactions
      .filter(t => t.category === category.name && t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      name: category.name,
      value: amount
    };
  }).filter(item => item.value > 0);

  // Prepare data for balance sheet
  const balanceSheetData = [
    { name: 'Assets', value: financialSummary.totalAssets },
    { name: 'Liabilities', value: financialSummary.totalLiabilities },
    { name: 'Equity', value: financialSummary.totalEquity }
  ];
  
  const COLORS = ['#4CAF50', '#2A5F8F', '#607D8B', '#F9A825', '#D32F2F'];
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border p-2 text-sm shadow-md rounded-md">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-finance-blue">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-finance-blue">Financial Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pl">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
            <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pl" className="animate-slide-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div>
                <h3 className="text-lg font-medium mb-4 text-center">Income Breakdown</h3>
                {incomeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={incomeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {incomeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No income data available
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4 text-center">Expense Breakdown</h3>
                {expenseData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={expenseData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {expenseData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No expense data available
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-4 text-center">Profit & Loss Summary</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { name: 'Income', value: financialSummary.totalIncome },
                    { name: 'Expenses', value: financialSummary.totalExpenses },
                    { name: 'Net Profit', value: financialSummary.netProfit }
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="value" name="Amount" fill="#2A5F8F" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="bs" className="animate-slide-up">
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-4 text-center">Balance Sheet Summary</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={balanceSheetData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="value" name="Amount" fill="#1C3D5A" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <Card className="border-l-4 border-l-finance-blue">
                <CardContent className="pt-6">
                  <h4 className="text-sm font-medium text-muted-foreground">Total Assets</h4>
                  <p className="text-2xl font-bold text-finance-blue">
                    {formatCurrency(financialSummary.totalAssets)}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-finance-red">
                <CardContent className="pt-6">
                  <h4 className="text-sm font-medium text-muted-foreground">Total Liabilities</h4>
                  <p className="text-2xl font-bold text-finance-red">
                    {formatCurrency(financialSummary.totalLiabilities)}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-finance-green">
                <CardContent className="pt-6">
                  <h4 className="text-sm font-medium text-muted-foreground">Total Equity</h4>
                  <p className="text-2xl font-bold text-finance-green">
                    {formatCurrency(financialSummary.totalEquity)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ChartSection;
