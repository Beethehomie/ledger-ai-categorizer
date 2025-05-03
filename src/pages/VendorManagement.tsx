import React, { useState, useEffect } from 'react';
import { useBookkeeping, BookkeepingProvider } from '@/context/BookkeepingContext';
import { Store, Edit, Check, X, Search, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { BackToDashboard } from '@/components/header/BackToDashboard';
import { toast } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';
import { Vendor, Transaction } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateVendorEmbeddings } from '@/utils/embeddingUtils';
import VendorTransactionsDisplay from '@/components/vendor/VendorTransactionsDisplay';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Create a wrapper component that uses the hook
const VendorManagementContent: React.FC = () => {
  const { 
    vendors, 
    getVendorsList, 
    verifyVendor, 
    transactions,
    findSimilarTransactions,
    batchVerifyVendorTransactions,
    removeDuplicateVendors,
    loading 
  } = useBookkeeping();
  
  const [vendorsList, setVendorsList] = useState<Array<{name: string; count: number; verified: boolean}>>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [vendorTransactions, setVendorTransactions] = useState<Transaction[]>([]);
  const [isGeneratingEmbeddings, setIsGeneratingEmbeddings] = useState<boolean>(false);
  const [isRemovingDuplicates, setIsRemovingDuplicates] = useState<boolean>(false);
  const [isFindingSimilar, setIsFindingSimilar] = useState<boolean>(false);
  const [similarTransactions, setSimilarTransactions] = useState<Transaction[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  
  const [newVendorName, setNewVendorName] = useState<string>('');
  const [newVendorCategory, setNewVendorCategory] = useState<string>('');
  const [newVendorType, setNewVendorType] = useState<'income' | 'expense'>('expense');
  
  // Load vendors on component mount
  useEffect(() => {
    loadVendors();
  }, [vendors]);
  
  const loadVendors = () => {
    const list = getVendorsList();
    setVendorsList(list);
  };
  
  // Update vendor transactions when a vendor is selected
  useEffect(() => {
    if (selectedVendor) {
      const filteredTransactions = transactions.filter(t => t.vendor === selectedVendor);
      setVendorTransactions(filteredTransactions);
    } else {
      setVendorTransactions([]);
    }
  }, [selectedVendor, transactions]);
  
  const filteredVendors = vendorsList.filter(vendor => 
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleVerifyVendor = async (vendorName: string, approved: boolean) => {
    try {
      await verifyVendor(vendorName, approved);
      toast.success(`Vendor ${approved ? 'approved' : 'rejected'}`);
    } catch (error) {
      console.error('Error verifying vendor:', error);
      toast.error('Failed to update vendor status');
    }
  };
  
  const handleGenerateEmbeddings = async () => {
    setIsGeneratingEmbeddings(true);
    try {
      const result = await generateVendorEmbeddings();
      
      if (result.success) {
        toast.success(`Generated ${result.count || 0} vendor embeddings`);
      } else {
        toast.error('Failed to generate embeddings');
      }
    } catch (error) {
      console.error('Error generating embeddings:', error);
      toast.error('Failed to generate embeddings');
    } finally {
      setIsGeneratingEmbeddings(false);
    }
  };
  
  const handleRemoveDuplicates = async () => {
    setIsRemovingDuplicates(true);
    try {
      await removeDuplicateVendors();
      loadVendors();
      toast.success('Duplicate vendors removed');
    } catch (error) {
      console.error('Error removing duplicates:', error);
      toast.error('Failed to remove duplicate vendors');
    } finally {
      setIsRemovingDuplicates(false);
    }
  };
  
  const handleFindSimilarTransactions = async () => {
    if (!selectedVendor) return;
    
    setIsFindingSimilar(true);
    try {
      const similar = await findSimilarTransactions(selectedVendor, transactions);
      setSimilarTransactions(similar);
      
      if (similar.length > 0) {
        toast.success(`Found ${similar.length} similar transactions`);
      } else {
        toast.info('No similar transactions found');
      }
    } catch (error) {
      console.error('Error finding similar transactions:', error);
      toast.error('Failed to find similar transactions');
    } finally {
      setIsFindingSimilar(false);
    }
  };
  
  const handleBatchVerify = async () => {
    if (!selectedVendor || !editingVendor) return;
    
    try {
      await batchVerifyVendorTransactions(
        selectedVendor,
        editingVendor.category,
        editingVendor.type,
        editingVendor.statementType
      );
      
      const filteredTransactions = transactions.filter(t => t.vendor === selectedVendor);
      setVendorTransactions(filteredTransactions);
      setIsDialogOpen(false);
      toast.success('Transactions verified successfully');
    } catch (error) {
      console.error('Error batch verifying transactions:', error);
      toast.error('Failed to verify transactions');
    }
  };
  
  const openEditDialog = (vendor: string) => {
    const vendorInfo = vendors.find(v => v.name === vendor);
    
    if (vendorInfo) {
      setEditingVendor(vendorInfo);
      setNewVendorName(vendorInfo.name);
      setNewVendorCategory(vendorInfo.category);
      setNewVendorType(vendorInfo.type as 'income' | 'expense');
      setIsDialogOpen(true);
    } else {
      toast.error('Vendor information not found');
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Vendor Management</h1>
        <BackToDashboard />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Vendors</CardTitle>
              <CardDescription>
                {vendorsList.length} vendors in your system
              </CardDescription>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVendors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center h-24">
                          No vendors found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredVendors.map((vendor) => (
                        <TableRow 
                          key={vendor.name}
                          className={selectedVendor === vendor.name ? 'bg-muted/50' : ''}
                          onClick={() => setSelectedVendor(vendor.name)}
                        >
                          <TableCell className="font-medium">{vendor.name}</TableCell>
                          <TableCell>{vendor.count}</TableCell>
                          <TableCell>
                            {vendor.verified ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditDialog(vendor.name);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <div className="flex items-center justify-between w-full">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRemoveDuplicates}
                  disabled={isRemovingDuplicates || loading}
                >
                  {isRemovingDuplicates ? 'Processing...' : 'Remove Duplicates'}
                </Button>
                <Button 
                  size="sm"
                  onClick={handleGenerateEmbeddings}
                  disabled={isGeneratingEmbeddings}
                >
                  {isGeneratingEmbeddings ? 'Generating...' : 'Generate Embeddings'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          {selectedVendor ? (
            <Tabs defaultValue="transactions" className="w-full">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="similar">Similar Transactions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="transactions" className="mt-0">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>{selectedVendor}</CardTitle>
                      <CardDescription>
                        {vendorTransactions.length} transactions for this vendor
                      </CardDescription>
                    </div>
                    <Button
                      onClick={handleFindSimilarTransactions}
                      disabled={isFindingSimilar || loading}
                      variant="outline"
                    >
                      {isFindingSimilar ? 'Finding...' : 'Find Similar'}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <VendorTransactionsDisplay 
                      selectedVendor={selectedVendor}
                      transactions={vendorTransactions}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="similar" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Similar Transactions</CardTitle>
                    <CardDescription>
                      Transactions that may match the vendor pattern for {selectedVendor}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {similarTransactions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No similar transactions found.
                        <div className="mt-2">
                          <Button 
                            onClick={handleFindSimilarTransactions}
                            variant="outline" 
                            size="sm"
                            disabled={isFindingSimilar}
                          >
                            {isFindingSimilar ? 'Finding...' : 'Find Similar Transactions'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="border rounded-md overflow-auto max-h-[400px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead className="min-w-[300px]">Description</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Confidence</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {similarTransactions.map((transaction) => (
                                <TableRow key={transaction.id}>
                                  <TableCell>{transaction.date}</TableCell>
                                  <TableCell className="font-medium max-w-[300px] truncate">
                                    {transaction.description}
                                  </TableCell>
                                  <TableCell className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {transaction.amount.toFixed(2)}
                                  </TableCell>
                                  <TableCell>
                                    {transaction.confidenceScore ? 
                                      `${(transaction.confidenceScore * 100).toFixed(0)}%` : 'N/A'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="mt-4">
                          <Button onClick={() => {
                            if (editingVendor) {
                              handleBatchVerify();
                            } else {
                              openEditDialog(selectedVendor);
                            }
                          }}>
                            Assign to {selectedVendor}
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="h-full flex items-center justify-center bg-muted/20 border rounded-lg p-8">
              <div className="text-center">
                <Store className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Select a Vendor</h3>
                <p className="text-muted-foreground">
                  Click on a vendor from the list to view and manage their transactions
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>
              Update vendor information and classification
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="vendorName" className="text-right font-medium">
                Name
              </label>
              <Input
                id="vendorName"
                value={newVendorName}
                onChange={(e) => setNewVendorName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="category" className="text-right font-medium">
                Category
              </label>
              <Input
                id="category"
                value={newVendorCategory}
                onChange={(e) => setNewVendorCategory(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right font-medium">Type</label>
              <div className="col-span-3 flex items-center space-x-2">
                <Button
                  variant={newVendorType === 'income' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewVendorType('income')}
                >
                  Income
                </Button>
                <Button
                  variant={newVendorType === 'expense' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewVendorType('expense')}
                >
                  Expense
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setIsDialogOpen(false)} variant="outline">Cancel</Button>
            <Button onClick={handleBatchVerify}>Save & Verify All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Main component that wraps the content with the provider
const VendorManagement: React.FC = () => {
  return (
    <BookkeepingProvider>
      <VendorManagementContent />
    </BookkeepingProvider>
  );
};

export default VendorManagement;
