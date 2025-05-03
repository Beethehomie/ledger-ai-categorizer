import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBookkeeping } from '@/context/BookkeepingContext';
import { toast } from '@/utils/toast';
import { BackToDashboard } from '@/components/header/BackToDashboard';
import { Transaction } from '@/types';
import { parseCSV, CSVParseResult } from '@/utils/csvParser';

const TransactionUpload: React.FC = () => {
  const navigate = useNavigate();
  const { uploadCSV, loading, bankConnections } = useBookkeeping();
  const [parsedData, setParsedData] = useState<CSVParseResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [endBalance, setEndBalance] = useState<number | undefined>(undefined);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setSelectedFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const result = parseCSV(content);
        setParsedData(result);
        
        if (result.warnings.length > 0) {
          toast.warning(`${result.warnings.length} issues found in file`);
        } else {
          toast.success('CSV parsed successfully');
        }
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast.error('Failed to parse CSV file');
      }
    };
    
    reader.readAsText(file);
  };
  
  const handleConfirmUpload = async () => {
    if (!parsedData || parsedData.transactions.length === 0) {
      toast.error('No valid transactions to upload');
      return;
    }
    
    try {
      await uploadCSV(
        parsedData.transactions, 
        selectedBankId || undefined,
        initialBalance,
        undefined,
        endBalance
      );
      
      setParsedData(null);
      setSelectedFile(null);
      toast.success('Transactions uploaded successfully');
      navigate('/');
    } catch (error) {
      console.error('Error uploading transactions:', error);
      toast.error('Failed to upload transactions');
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Transaction Upload</h1>
        <BackToDashboard />
      </div>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload Bank Transactions</CardTitle>
            <CardDescription>
              Upload a CSV file containing your bank transactions. 
              Supported columns: date, description, amount, balance (optional).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 mb-6">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-500 mb-4">
                Click to browse or drag and drop your CSV file
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-white
                  hover:file:bg-primary/90"
              />
            </div>
            
            {selectedFile && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">File Information</h3>
                <div className="bg-muted p-4 rounded-md">
                  <p><strong>Name:</strong> {selectedFile.name}</p>
                  <p><strong>Size:</strong> {(selectedFile.size / 1024).toFixed(2)} KB</p>
                  <p><strong>Type:</strong> {selectedFile.type || 'text/csv'}</p>
                </div>
              </div>
            )}
            
            {bankConnections && bankConnections.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Select Bank Account (optional)
                </label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                >
                  <option value="">-- Select a bank account --</option>
                  {bankConnections.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.display_name || bank.bank_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Initial Balance (optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full p-2 border rounded-md"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Ending Balance (optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full p-2 border rounded-md"
                  value={endBalance !== undefined ? endBalance : ""}
                  onChange={(e) => setEndBalance(e.target.value === "" ? undefined : Number(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {parsedData && (
          <Card>
            <CardHeader>
              <CardTitle>Preview Transactions</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={parsedData.warnings.length === 0 ? "outline" : "destructive"} className={parsedData.warnings.length === 0 ? "bg-green-50 text-green-700 border-green-200" : ""}>
                  {parsedData.transactions.length} Transactions
                </Badge>
                {parsedData.warnings.length > 0 && (
                  <Badge variant="outline">
                    {parsedData.warnings.length} Warnings
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {parsedData.warnings.length > 0 && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Validation Issues</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5">
                      {parsedData.warnings.slice(0, 3).map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                      {parsedData.warnings.length > 3 && (
                        <li>...and {parsedData.warnings.length - 3} more issues</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="border rounded-md overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="min-w-[300px]">Description</TableHead>
                      <TableHead>Amount</TableHead>
                      {parsedData.transactions.some(t => t.balance !== undefined) && (
                        <TableHead>Balance</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.transactions.slice(0, 100).map((transaction, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{transaction.date}</TableCell>
                        <TableCell className="font-medium max-w-[300px] truncate">
                          {transaction.description}
                        </TableCell>
                        <TableCell className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {transaction.amount.toFixed(2)}
                        </TableCell>
                        {parsedData.transactions.some(t => t.balance !== undefined) && (
                          <TableCell>{transaction.balance?.toFixed(2) || '-'}</TableCell>
                        )}
                      </TableRow>
                    ))}
                    {parsedData.transactions.length > 100 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Showing 100 of {parsedData.transactions.length} transactions
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleConfirmUpload} 
                disabled={parsedData.transactions.length === 0 || loading}
                className="ml-auto"
              >
                {loading ? 'Uploading...' : 'Confirm Upload'}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TransactionUpload;
