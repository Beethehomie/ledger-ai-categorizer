import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  CheckCircle, 
  XCircle,
  Upload,
  Download,
  Trash2
} from "lucide-react";
import { toast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from "@/components/ui/badge";
import { useBookkeeping } from '@/context/BookkeepingContext';

// Create a wrapper component for VendorImporter that accepts onImportSuccess
const VendorImporterWrapper: React.FC<{ onImportSuccess: () => void }> = ({ onImportSuccess }) => {
  // We'll assume VendorImporter is a non-modifiable component
  // So we'll wrap it and handle the success callback here
  
  // Import the actual VendorImporter component
  const VendorImporter = require('@/components/VendorImporter').default;
  
  const handleSuccess = () => {
    // Call the passed callback
    onImportSuccess();
  };
  
  return <VendorImporter onSuccess={handleSuccess} />;
};

interface VendorData {
  id: string;
  name: string;
  category: string;
  type: string;
  statementType: string;
  occurrences: number;
  verified: boolean;
  sampleDescription?: string;
}

export const VendorManagement: React.FC = () => {
  const { removeDuplicateVendors } = useBookkeeping();
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<VendorData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(false);
  const [isDuplicateRemovalLoading, setIsDuplicateRemovalLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  
  const ITEMS_PER_PAGE = 100;
  
  const fetchVendors = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_categorizations')
        .select('*')
        .order('vendor_name', { ascending: true });
      
      if (error) throw error;
      
      const vendorData: VendorData[] = data.map(v => ({
        id: v.id,
        name: v.vendor_name || '',
        category: v.category || '',
        type: v.type || 'expense',
        statementType: v.statement_type || 'profit_loss',
        occurrences: v.occurrences || 1,
        verified: v.verified || false,
        sampleDescription: v.sample_description
      }));
      
      setVendors(vendorData);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(vendorData.map(v => v.category))];
      setCategories(uniqueCategories.filter(Boolean).sort());
      
      toast.success('Vendor data loaded successfully');
    } catch (err: any) {
      console.error('Error fetching vendors:', err);
      toast.error('Failed to load vendor data: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchVendors();
  }, []);
  
  useEffect(() => {
    // Apply filters and sorting
    let filtered = [...vendors];
    
    // Search query
    if (searchQuery) {
      filtered = filtered.filter(vendor => 
        vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (vendor.sampleDescription && vendor.sampleDescription.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter(vendor => vendor.category === categoryFilter);
    }
    
    // Type filter
    if (typeFilter) {
      filtered = filtered.filter(vendor => vendor.type === typeFilter);
    }
    
    // Verified filter
    if (verifiedFilter === 'verified') {
      filtered = filtered.filter(vendor => vendor.verified);
    } else if (verifiedFilter === 'pending') {
      filtered = filtered.filter(vendor => !vendor.verified);
    }
    
    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'occurrences':
          comparison = a.occurrences - b.occurrences;
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    setFilteredVendors(filtered);
    setCurrentPage(1);
  }, [vendors, searchQuery, categoryFilter, typeFilter, verifiedFilter, sortField, sortOrder]);
  
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };
  
  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setTypeFilter('');
    setVerifiedFilter('');
    setSortField('name');
    setSortOrder('asc');
  };
  
  const handleVerifyVendor = async (vendorId: string, verified: boolean) => {
    try {
      const { error } = await supabase
        .from('vendor_categorizations')
        .update({ verified })
        .eq('id', vendorId);
        
      if (error) throw error;
      
      // Update local state
      setVendors(prevVendors => 
        prevVendors.map(v => v.id === vendorId ? { ...v, verified } : v)
      );
      
      toast.success(`Vendor ${verified ? 'verified' : 'rejected'} successfully`);
    } catch (err: any) {
      console.error('Error updating vendor:', err);
      toast.error('Failed to update vendor: ' + (err.message || 'Unknown error'));
    }
  };
  
  const handleDeleteVendor = async (vendorId: string) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return;
    
    try {
      const { error } = await supabase
        .from('vendor_categorizations')
        .delete()
        .eq('id', vendorId);
        
      if (error) throw error;
      
      // Update local state
      setVendors(prevVendors => prevVendors.filter(v => v.id !== vendorId));
      
      toast.success('Vendor deleted successfully');
    } catch (err: any) {
      console.error('Error deleting vendor:', err);
      toast.error('Failed to delete vendor: ' + (err.message || 'Unknown error'));
    }
  };
  
  const handleRemoveDuplicates = async () => {
    setIsDuplicateRemovalLoading(true);
    try {
      await removeDuplicateVendors();
      await fetchVendors();
      toast.success('Duplicate vendors removed successfully');
    } catch (error) {
      console.error('Error removing duplicates:', error);
      toast.error('Failed to remove duplicate vendors');
    } finally {
      setIsDuplicateRemovalLoading(false);
    }
  };
  
  const exportVendorData = () => {
    try {
      const dataStr = JSON.stringify(filteredVendors, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `vendors_export_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success('Vendor data exported successfully');
    } catch (error) {
      toast.error('Failed to export vendor data');
    }
  };
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredVendors.length / ITEMS_PER_PAGE);
  const paginatedVendors = filteredVendors.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  // Generate page numbers for pagination
  const generatePaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink 
              isActive={currentPage === i}
              onClick={() => setCurrentPage(i)}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      // Always show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink 
            isActive={currentPage === 1}
            onClick={() => setCurrentPage(1)}
          >
            1
          </PaginationLink>
        </PaginationItem>
      );
      
      if (currentPage > 3) {
        items.push(
          <PaginationItem key="ellipsis1">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
      
      // Show pages around current page
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = startPage; i <= endPage; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink 
              isActive={currentPage === i}
              onClick={() => setCurrentPage(i)}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
      
      if (currentPage < totalPages - 2) {
        items.push(
          <PaginationItem key="ellipsis2">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
      
      // Always show last page
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink 
            isActive={currentPage === totalPages}
            onClick={() => setCurrentPage(totalPages)}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    return items;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Vendor Management</h2>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchVendors}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleRemoveDuplicates}
            disabled={isDuplicateRemovalLoading}
            className="flex items-center gap-2"
          >
            {isDuplicateRemovalLoading ? (
              <>
                <div className="h-4 w-4 border-t-2 border-b-2 border-current rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Duplicates
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={exportVendorData}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="flex items-center gap-2">
                <Upload className="h-4 w-4 mr-2" />
                Import Vendor CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle>Import Vendor Data</DialogTitle>
              </DialogHeader>
              <div className="pt-4">
                <VendorImporterWrapper onImportSuccess={() => {
                  setIsImportDialogOpen(false);
                  fetchVendors();
                }} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-4 items-end">
        <div className="w-64">
          <label className="text-sm font-medium mb-1 block">Search</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        <div className="w-48">
          <label className="text-sm font-medium mb-1 block">Category</label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-48">
          <label className="text-sm font-medium mb-1 block">Type</label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="asset">Asset</SelectItem>
              <SelectItem value="liability">Liability</SelectItem>
              <SelectItem value="equity">Equity</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-48">
          <label className="text-sm font-medium mb-1 block">Status</label>
          <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Vendors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Vendors</SelectItem>
              <SelectItem value="verified">Verified Only</SelectItem>
              <SelectItem value="pending">Pending Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-48">
          <label className="text-sm font-medium mb-1 block">Sort By</label>
          <div className="flex items-center gap-2">
            <Select value={sortField} onValueChange={setSortField}>
              <SelectTrigger className="flex-grow">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Vendor Name</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="occurrences">Occurrences</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="ghost" 
              size="icon" 
              onClick={toggleSortOrder}
            >
              {sortOrder === 'asc' ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          onClick={resetFilters}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4 mr-2" />
          Reset Filters
        </Button>
      </div>
      
      <div className="border rounded-md">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statement Type</TableHead>
                <TableHead>Occurrences</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedVendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">
                    {vendor.name}
                    {vendor.sampleDescription && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {vendor.sampleDescription}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {vendor.category ? (
                      <Badge variant="outline">{vendor.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground">Uncategorized</span>
                    )}
                  </TableCell>
                  <TableCell>{vendor.type}</TableCell>
                  <TableCell>
                    {vendor.statementType === 'profit_loss' ? 'Profit & Loss' : 'Balance Sheet'}
                  </TableCell>
                  <TableCell>{vendor.occurrences}</TableCell>
                  <TableCell>
                    {vendor.verified ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <XCircle className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVerifyVendor(vendor.id, true)}
                      className={vendor.verified ? "text-muted-foreground" : "text-green-600"}
                      disabled={vendor.verified}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVerifyVendor(vendor.id, false)}
                      className={!vendor.verified ? "text-muted-foreground" : "text-red-600"}
                      disabled={!vendor.verified}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteVendor(vendor.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              
              {paginatedVendors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">No vendors found matching your filters.</p>
                    <Button
                      variant="link"
                      onClick={resetFilters}
                      className="mt-2"
                    >
                      Reset Filters
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) {
                    setCurrentPage(prev => prev - 1);
                  }
                }}
                aria-disabled={currentPage === 1}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            
            {generatePaginationItems()}
            
            <PaginationItem>
              <PaginationNext 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) {
                    setCurrentPage(prev => prev + 1);
                  }
                }}
                aria-disabled={currentPage === totalPages}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
      
      <div className="text-sm text-muted-foreground">
        Showing {paginatedVendors.length} of {filteredVendors.length} vendors
        ({vendors.length} total) • Page {currentPage} of {totalPages || 1}
      </div>
    </div>
  );
};
