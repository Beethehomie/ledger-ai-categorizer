
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Search, BadgeCheck, Database, Download } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';
import { VendorCategorizationRow } from '@/types/supabase';
import { exportToCSV } from '@/utils/csvParser';

const VendorKeywordsList: React.FC = () => {
  const [vendors, setVendors] = useState<VendorCategorizationRow[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<VendorCategorizationRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = vendors.filter(vendor => 
        vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredVendors(filtered);
    } else {
      setFilteredVendors(vendors);
    }
  }, [searchTerm, vendors]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vendor_categorizations')
        .select('*')
        .order('vendor_name', { ascending: true });
      
      if (error) throw error;
      
      if (data) {
        const formattedVendors = data.map(vendor => ({
          id: vendor.id,
          vendor_name: vendor.vendor_name,
          category: vendor.category || '',
          type: vendor.type || '',
          statement_type: vendor.statement_type || '',
          occurrences: vendor.occurrences || 0,
          verified: vendor.verified || false,
          created_at: vendor.created_at,
          last_used: vendor.last_used || vendor.created_at,
          confidence: vendor.confidence || 0.7
        }));
        
        setVendors(formattedVendors);
        setFilteredVendors(formattedVendors);
      }
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
      const vendorsForExport = vendors.map(v => ({
        vendor_name: v.vendor_name,
        category: v.category,
        type: v.type,
        statement_type: v.statement_type,
        occurrences: v.occurrences,
        verified: v.verified ? 'Yes' : 'No',
        confidence: v.confidence
      }));
      
      const csvData = exportToCSV(vendorsForExport);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `vendor_keywords_${date}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Vendor keywords exported to CSV successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export vendor keywords');
    }
  };

  return (
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
        <div className="flex justify-between items-center mb-4">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vendors..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={exportVendorsToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export Keywords
          </Button>
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
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.slice(0, 100).map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">{vendor.vendor_name}</TableCell>
                    <TableCell>{vendor.category}</TableCell>
                    <TableCell>{vendor.type}</TableCell>
                    <TableCell>{vendor.occurrences || 0}</TableCell>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredVendors.length > 100 && (
              <div className="py-2 px-4 text-sm text-muted-foreground text-center">
                Showing 100 of {filteredVendors.length} results. Please refine your search to see more.
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>No vendor keywords found matching your search criteria</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VendorKeywordsList;
