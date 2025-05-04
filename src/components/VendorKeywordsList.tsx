import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Search, BadgeCheck, Database, Download, Filter } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';
import { VendorCategorizationRow } from '@/types/supabase';
import VendorEmbeddings from './vendor/VendorEmbeddings';
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
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { useIsMobile } from '@/hooks/use-mobile';
import ColumnSelector, { Column } from './ColumnSelector';
import { TableColumn } from '@/types';

const ITEMS_PER_PAGE = 100; // Increased to 100 items per page
const MAX_VENDORS = 10000;

const VendorKeywordsList: React.FC = () => {
  const [vendors, setVendors] = useState<VendorCategorizationRow[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<VendorCategorizationRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterOption, setFilterOption] = useState<'all' | 'verified' | 'pending'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const isMobile = useIsMobile();
  
  // Column visibility state
  const [columns, setColumns] = useState<Column[]>([
    { id: 'vendor_name', label: 'Vendor Name', visible: true },
    { id: 'category', label: 'Category', visible: true },
    { id: 'type', label: 'Type', visible: true },
    { id: 'occurrences', label: 'Usage', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'actions', label: 'Actions', visible: true },
  ]);

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    let filtered = vendors;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(vendor => 
        vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply verification status filter
    if (filterOption === 'verified') {
      filtered = filtered.filter(vendor => vendor.verified === true);
    } else if (filterOption === 'pending') {
      filtered = filtered.filter(vendor => vendor.verified !== true);
    }
    
    setFilteredVendors(filtered);
    setTotalItems(filtered.length);
    setTotalPages(Math.ceil(filtered.length / ITEMS_PER_PAGE));
    
    // Reset to first page when filters change
    if (currentPage > Math.ceil(filtered.length / ITEMS_PER_PAGE)) {
      setCurrentPage(1);
    }
  }, [searchTerm, vendors, filterOption]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      
      // Fetch vendors in batches to handle large datasets
      let allVendors: VendorCategorizationRow[] = [];
      let lastId: string | null = null;
      let hasMoreData = true;
      
      while (hasMoreData && allVendors.length < MAX_VENDORS) {
        let query = supabase
          .from('vendor_categorizations')
          .select('*')
          .order('vendor_name', { ascending: true })
          .limit(1000); // Fetch in batches of 1000
        
        if (lastId) {
          query = query.gt('id', lastId);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allVendors = [...allVendors, ...data];
          lastId = data[data.length - 1].id;
        } else {
          hasMoreData = false;
        }
        
        // Stop fetching if we've hit the limit
        if (allVendors.length >= MAX_VENDORS) {
          hasMoreData = false;
        }
      }
      
      // Transform the vendors to include all required properties
      const formattedVendors = allVendors.map(vendor => ({
        ...vendor,
        confidence: vendor.confidence || 0.7
      }));
      
      setVendors(formattedVendors);
      setFilteredVendors(formattedVendors);
      setTotalItems(formattedVendors.length);
      setTotalPages(Math.ceil(formattedVendors.length / ITEMS_PER_PAGE));
      
      console.log(`Loaded ${formattedVendors.length} vendor keywords`);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to load vendor keywords');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyVendor = async (vendorId: string, verified: boolean) => {
    try {
      const { error } = await supabase
        .from('vendor_categorizations')
        .update({ verified })
        .eq('id', vendorId);
      
      if (error) throw error;
      
      setVendors(prev => prev.map(vendor => 
        vendor.id === vendorId ? { ...vendor, verified } : vendor
      ));
      
      toast.success(`Vendor ${verified ? 'approved' : 'rejected'}`);
    } catch (error) {
      console.error('Error updating vendor:', error);
      toast.error('Failed to update vendor status');
    }
  };

  const exportVendorsToCSV = () => {
    try {
      // Determine if we should export all vendors or just the filtered ones
      const vendorsToExport = searchTerm || filterOption !== 'all' 
        ? filteredVendors 
        : vendors;
      
      const vendorsForExport = vendorsToExport.map(v => ({
        vendor_name: v.vendor_name,
        category: v.category,
        type: v.type,
        statement_type: v.statement_type,
        occurrences: v.occurrences,
        verified: v.verified ? 'Yes' : 'No',
        confidence: v.confidence || 0
      }));
      
      const headers = Object.keys(vendorsForExport[0] || {}).join(',');
      const rows = vendorsForExport.map(obj => 
        Object.values(obj).map(value => 
          typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
        ).join(',')
      );
      const csvData = [headers, ...rows].join('\n');
      
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `vendor_keywords_${date}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${vendorsForExport.length} vendor keywords to CSV successfully`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export vendor keywords');
    }
  };

  // Handle toggling column visibility
  const handleToggleColumn = (columnId: string) => {
    setColumns(prev => 
      prev.map(col => 
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  };

  // Get current page items
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredVendors.slice(startIndex, endIndex);
  };

  // Generate page numbers for pagination
  const generatePaginationItems = () => {
    let pages = [];
    const maxPagesToShow = isMobile ? 3 : 5;
    
    // Always show first page
    pages.push(1);
    
    if (totalPages <= maxPagesToShow) {
      // If we have few pages, show all of them
      for (let i = 2; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show ellipsis and surrounding pages
      if (currentPage > 3) {
        pages.push('ellipsis');
      }
      
      // Pages around current
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }
      
      // Always show last page if more than 1 page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Helper to check if a column is visible
  const isColumnVisible = (columnId: string) => {
    return columns.find(col => col.id === columnId)?.visible;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Database className="h-4 w-4 mr-2 text-primary" />
            Vendor Keywords Database
          </CardTitle>
          <CardDescription>
            All vendor keywords and their category mappings for transaction auto-categorization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={filterOption}
                  onValueChange={(value) => setFilterOption(value as 'all' | 'verified' | 'pending')}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Keywords</SelectItem>
                    <SelectItem value="verified">Verified Only</SelectItem>
                    <SelectItem value="pending">Pending Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <ColumnSelector columns={columns} onToggleColumn={handleToggleColumn} />
              <Button variant="outline" onClick={exportVendorsToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export Keywords
              </Button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary rounded-full" />
            </div>
          ) : filteredVendors.length > 0 ? (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isColumnVisible('vendor_name') && <TableHead>Vendor Name</TableHead>}
                    {isColumnVisible('category') && <TableHead>Category</TableHead>}
                    {isColumnVisible('type') && <TableHead>Type</TableHead>}
                    {isColumnVisible('occurrences') && <TableHead>Usage</TableHead>}
                    {isColumnVisible('status') && <TableHead className="text-center">Status</TableHead>}
                    {isColumnVisible('actions') && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getCurrentPageItems().map((vendor) => (
                    <TableRow key={vendor.id}>
                      {isColumnVisible('vendor_name') && <TableCell className="font-medium">{vendor.vendor_name}</TableCell>}
                      {isColumnVisible('category') && <TableCell>{vendor.category}</TableCell>}
                      {isColumnVisible('type') && <TableCell>{vendor.type}</TableCell>}
                      {isColumnVisible('occurrences') && <TableCell>{vendor.occurrences || 0}</TableCell>}
                      {isColumnVisible('status') && (
                        <TableCell className="text-center">
                          {vendor.verified ? (
                            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <BadgeCheck className="h-3 w-3 mr-1" />
                              Verified
                            </div>
                          ) : (
                            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              Pending
                            </div>
                          )}
                        </TableCell>
                      )}
                      {isColumnVisible('actions') && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleVerifyVendor(vendor.id, true)}
                              className={`h-8 px-2 ${vendor.verified ? 'text-muted-foreground' : 'text-green-600'}`}
                              disabled={vendor.verified}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleVerifyVendor(vendor.id, false)}
                              className="h-8 px-2 text-red-600"
                              disabled={!vendor.verified}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {totalItems > ITEMS_PER_PAGE && (
                <div className="flex flex-col sm:flex-row justify-between items-center py-4 px-2 gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems} entries
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          aria-disabled={currentPage === 1}
                        />
                      </PaginationItem>
                      
                      {generatePaginationItems().map((page, index) => 
                        page === 'ellipsis' ? (
                          <PaginationItem key={`ellipsis-${index}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={page}>
                            <PaginationLink 
                              isActive={currentPage === page}
                              onClick={() => setCurrentPage(page as number)}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          aria-disabled={currentPage === totalPages}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No vendor keywords found matching your search criteria</p>
            </div>
          )}

          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium">Verified Vendor Statistics</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-muted rounded-md p-4">
                <div className="text-sm text-muted-foreground">Total Keywords</div>
                <div className="text-2xl font-bold">{vendors.length}</div>
              </div>
              <div className="bg-muted rounded-md p-4">
                <div className="text-sm text-muted-foreground">Verified Keywords</div>
                <div className="text-2xl font-bold">{vendors.filter(v => v.verified).length}</div>
              </div>
              <div className="bg-muted rounded-md p-4">
                <div className="text-sm text-muted-foreground">Pending Keywords</div>
                <div className="text-2xl font-bold">{vendors.filter(v => !v.verified).length}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <VendorEmbeddings />
    </>
  );
};

export default VendorKeywordsList;
