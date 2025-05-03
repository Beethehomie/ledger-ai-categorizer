
import React, { useState, useEffect } from 'react';
import { useBookkeeping } from '@/context/BookkeepingContext';
import { useSettings } from '@/context/SettingsContext';
import { FileText, Download, BarChart3, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { BackToDashboard } from '@/components/header/BackToDashboard';
import { toast } from '@/utils/toast';
import { FinancialSummary } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const FinancialReports: React.FC = () => {
  const { transactions, financialSummary, calculateFinancialSummary } = useBookkeeping();
  const { currency } = useSettings();
  
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedPeriod, setSelectedPeriod] = useState<string>('year');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
  const [selectedQuarter, setSelectedQuarter] = useState<string>('1');
  
  // Generate list of available years based on transaction dates
  const availableYears = React.useMemo(() => {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear();
    
    // Always include current year
    years.add(currentYear.toString());
    
    transactions.forEach(transaction => {
      const year = new Date(transaction.date).getFullYear().toString();
      years.add(year);
    });
    
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [transactions]);
  
  useEffect(() => {
    // Recalculate financial summary when filters change
    calculateFinancialSummary();
  }, [selectedYear, selectedPeriod, selectedMonth, selectedQuarter, calculateFinancialSummary]);
  
  // Format currency amount
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };
  
  const handleDownloadReport = (reportType: string) => {
    const filteredData = filterTransactionsByPeriod();
    if (filteredData.length === 0) {
      toast.warning('No data available for the selected period');
      return;
    }
    
    let content = '';
    let fileName = '';
    
    if (reportType === 'income-statement') {
      content = generateIncomeStatementCSV();
      fileName = `income-statement-${selectedYear}`;
    } else if (reportType === 'balance-sheet') {
      content = generateBalanceSheetCSV();
      fileName = `balance-sheet-${selectedYear}`;
    } else if (reportType === 'cash-flow') {
      content = generateCashFlowCSV();
      fileName = `cash-flow-statement-${selectedYear}`;
    }
    
    // Add period details to file name
    if (selectedPeriod === 'month') {
      fileName += `-${parseInt(selectedMonth) + 1}`;
    } else if (selectedPeriod === 'quarter') {
      fileName += `-Q${selectedQuarter}`;
    }
    
    // Create and download file
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${fileName}.csv`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const filterTransactionsByPeriod = () => {
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const transactionYear = transactionDate.getFullYear().toString();
      
      if (transactionYear !== selectedYear) return false;
      
      if (selectedPeriod === 'year') {
        return true;
      } else if (selectedPeriod === 'month') {
        const transactionMonth = transactionDate.getMonth().toString();
        return transactionMonth === selectedMonth;
      } else if (selectedPeriod === 'quarter') {
        const month = transactionDate.getMonth();
        const quarter = Math.ceil((month + 1) / 3).toString();
        return quarter === selectedQuarter;
      }
      
      return false;
    });
  };
  
  const generateIncomeStatementCSV = () => {
    const headers = "Category,Amount\n";
    let rows = "";
    
    // Revenue section
    rows += "REVENUE\n";
    
    rows += `Total Revenue,${financialSummary.income.toFixed(2)}\n\n`;
    
    // Expenses section
    rows += "EXPENSES\n";
    financialSummary.expensesByCategory.forEach(expense => {
      rows += `${expense.category},${expense.amount.toFixed(2)}\n`;
    });
    
    rows += `\nTotal Expenses,${financialSummary.expenses.toFixed(2)}\n\n`;
    
    // Net Income
    rows += `NET INCOME,${financialSummary.netIncome.toFixed(2)}\n`;
    
    return headers + rows;
  };
  
  const generateBalanceSheetCSV = () => {
    const headers = "Category,Amount\n";
    let rows = "";
    
    // Assets
    rows += "ASSETS\n";
    rows += `Cash,${financialSummary.cashBalance.toFixed(2)}\n`;
    // Add other assets here if available
    
    rows += `\nTotal Assets,${financialSummary.cashBalance.toFixed(2)}\n\n`;
    
    // Liabilities and Equity
    rows += "LIABILITIES AND EQUITY\n";
    // Add liabilities here if available
    rows += `Equity,${financialSummary.cashBalance.toFixed(2)}\n`;
    
    rows += `\nTotal Liabilities and Equity,${financialSummary.cashBalance.toFixed(2)}\n`;
    
    return headers + rows;
  };
  
  const generateCashFlowCSV = () => {
    const headers = "Category,Amount\n";
    let rows = "";
    
    // Operating Activities
    rows += "OPERATING ACTIVITIES\n";
    rows += `Net Income,${financialSummary.netIncome.toFixed(2)}\n`;
    // Add adjustments here if available
    
    rows += `\nNet Cash from Operating Activities,${financialSummary.netIncome.toFixed(2)}\n\n`;
    
    // Investing Activities
    rows += "INVESTING ACTIVITIES\n";
    // Add investing activities here if available
    
    rows += `\nNet Cash from Investing Activities,0.00\n\n`;
    
    // Financing Activities
    rows += "FINANCING ACTIVITIES\n";
    // Add financing activities here if available
    
    rows += `\nNet Cash from Financing Activities,0.00\n\n`;
    
    // Net Change in Cash
    rows += `NET CHANGE IN CASH,${financialSummary.netIncome.toFixed(2)}\n`;
    
    return headers + rows;
  };
  
  const filteredTransactions = filterTransactionsByPeriod();
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Financial Reports</h1>
        <BackToDashboard />
      </div>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Report Settings</CardTitle>
            <CardDescription>
              Select the period for your financial reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Period Type</label>
                <Select
                  value={selectedPeriod}
                  onValueChange={setSelectedPeriod}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="year">Annual</SelectItem>
                    <SelectItem value="quarter">Quarterly</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Year</label>
                <Select
                  value={selectedYear}
                  onValueChange={setSelectedYear}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedPeriod === 'month' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Month</label>
                  <Select
                    value={selectedMonth}
                    onValueChange={setSelectedMonth}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {format(new Date(2000, i, 1), 'MMMM')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {selectedPeriod === 'quarter' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Quarter</label>
                  <Select
                    value={selectedQuarter}
                    onValueChange={setSelectedQuarter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Q1 (Jan-Mar)</SelectItem>
                      <SelectItem value="2">Q2 (Apr-Jun)</SelectItem>
                      <SelectItem value="3">Q3 (Jul-Sep)</SelectItem>
                      <SelectItem value="4">Q4 (Oct-Dec)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Tabs defaultValue="income-statement">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
            <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
            <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
          </TabsList>
          
          {/* Income Statement */}
          <TabsContent value="income-statement">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Income Statement</CardTitle>
                  <CardDescription>
                    For {selectedPeriod === 'year' ? 'Year' : selectedPeriod === 'quarter' ? `Q${selectedQuarter}` : format(new Date(parseInt(selectedYear), parseInt(selectedMonth)), 'MMMM')} {selectedYear}
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDownloadReport('income-statement')}
                >
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
              </CardHeader>
              <CardContent>
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No transaction data available for the selected period
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Revenue */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Revenue</h3>
                      <div className="border rounded-md">
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">Total Revenue</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(financialSummary.income)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    
                    {/* Expenses */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Expenses</h3>
                      <div className="border rounded-md">
                        <Table>
                          <TableBody>
                            {financialSummary.expensesByCategory.map((expense, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">{expense.category}</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(expense.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow>
                              <TableCell className="font-medium">Total Expenses</TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(financialSummary.expenses)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    
                    {/* Net Income */}
                    <div>
                      <div className="border rounded-md">
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-bold">Net Income</TableCell>
                              <TableCell className="text-right font-bold">
                                {formatCurrency(financialSummary.netIncome)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Balance Sheet */}
          <TabsContent value="balance-sheet">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Balance Sheet</CardTitle>
                  <CardDescription>
                    As of {selectedPeriod === 'year' ? `December 31, ${selectedYear}` : 
                           selectedPeriod === 'quarter' ? `${['March', 'June', 'September', 'December'][parseInt(selectedQuarter) - 1]} ${selectedYear}` : 
                           format(new Date(parseInt(selectedYear), parseInt(selectedMonth) + 1, 0), 'MMMM d, yyyy')}
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDownloadReport('balance-sheet')}
                >
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
              </CardHeader>
              <CardContent>
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No transaction data available for the selected period
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Assets */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Assets</h3>
                      <div className="border rounded-md">
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">Cash</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(financialSummary.cashBalance)}
                              </TableCell>
                            </TableRow>
                            {/* Add other assets here */}
                            <TableRow>
                              <TableCell className="font-semibold">Total Assets</TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(financialSummary.cashBalance)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    
                    {/* Liabilities and Equity */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Liabilities and Equity</h3>
                      <div className="border rounded-md">
                        <Table>
                          <TableBody>
                            {/* Add liabilities here if available */}
                            <TableRow>
                              <TableCell className="font-medium">Equity</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(financialSummary.cashBalance)}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-semibold">Total Liabilities and Equity</TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(financialSummary.cashBalance)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Cash Flow Statement */}
          <TabsContent value="cash-flow">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Cash Flow Statement</CardTitle>
                  <CardDescription>
                    For {selectedPeriod === 'year' ? 'Year' : selectedPeriod === 'quarter' ? `Q${selectedQuarter}` : format(new Date(parseInt(selectedYear), parseInt(selectedMonth)), 'MMMM')} {selectedYear}
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDownloadReport('cash-flow')}
                >
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
              </CardHeader>
              <CardContent>
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No transaction data available for the selected period
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Operating Activities */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Operating Activities</h3>
                      <div className="border rounded-md">
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">Net Income</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(financialSummary.netIncome)}
                              </TableCell>
                            </TableRow>
                            {/* Add adjustments here if available */}
                            <TableRow>
                              <TableCell className="font-semibold">Net Cash from Operations</TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(financialSummary.netIncome)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    
                    {/* Investing Activities */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Investing Activities</h3>
                      <div className="border rounded-md">
                        <Table>
                          <TableBody>
                            {/* Add investing activities here if available */}
                            <TableRow>
                              <TableCell className="font-medium">No investing activities</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(0)}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-semibold">Net Cash from Investing</TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(0)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    
                    {/* Financing Activities */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Financing Activities</h3>
                      <div className="border rounded-md">
                        <Table>
                          <TableBody>
                            {/* Add financing activities here if available */}
                            <TableRow>
                              <TableCell className="font-medium">No financing activities</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(0)}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-semibold">Net Cash from Financing</TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(0)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    
                    {/* Net Change in Cash */}
                    <div>
                      <div className="border rounded-md">
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-bold">Net Change in Cash</TableCell>
                              <TableCell className="text-right font-bold">
                                {formatCurrency(financialSummary.netIncome)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FinancialReports;
