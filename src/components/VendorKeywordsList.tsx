
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from '@/utils/toast';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Vendor } from '@/types';
import { useBookkeeping } from '@/context/BookkeepingContext';
import { VendorCategorizationRow } from '@/types/supabase';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/utils/errorLogger';

interface VendorKeywordsListProps {
  vendorName: string;
  onClose: () => void;
}

const VendorKeywordsList: React.FC<VendorKeywordsListProps> = ({ vendorName, onClose }) => {
  const [keywords, setKeywords] = useState<string>('');
  const [categorizations, setCategorizations] = useState<VendorCategorizationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyword, setNewKeyword] = useState('');
  const [similarVendor, setSimilarVendor] = useState<VendorCategorizationRow | null>(null);
  const { verifyVendor } = useBookkeeping();

  useEffect(() => {
    const fetchCategorizations = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('vendor_categorizations')
          .select('*')
          .eq('vendor_name', vendorName);
          
        if (error) {
          throw error;
        }
        
        if (data) {
          setCategorizations(data);
        }
      } catch (error) {
        logError("VendorKeywordsList.fetchCategorizations", error);
        toast.error('Failed to fetch vendor categorizations');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategorizations();
  }, [vendorName]);

  useEffect(() => {
    const fetchSimilarVendor = async () => {
      try {
        const { data, error } = await supabase
          .from('vendor_categorizations')
          .select('*')
          .neq('vendor_name', vendorName)
          .order('occurrences', { ascending: false })
          .limit(1);
          
        if (error) {
          throw error;
        }
        
        if (data && data.length > 0) {
          setSimilarVendor(data[0]);
        } else {
          setSimilarVendor(null);
        }
      } catch (error) {
        logError("VendorKeywordsList.fetchSimilarVendor", error);
        toast.error('Failed to fetch similar vendor');
      }
    };
    
    fetchSimilarVendor();
  }, [vendorName]);

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) {
      toast.error('Keyword cannot be empty');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('vendor_categorizations')
        .update({ sample_description: newKeyword })
        .eq('vendor_name', vendorName);
        
      if (error) {
        throw error;
      }
      
      setKeywords('');
      toast.success('Keyword added successfully');
    } catch (error) {
      logError("VendorKeywordsList.addKeyword", error);
      toast.error('Failed to add keyword');
    }
  };

  const handleVerifyVendor = async () => {
    try {
      await verifyVendor(vendorName, true);
      toast.success('Vendor verified successfully');
      onClose();
    } catch (error) {
      logError("VendorKeywordsList.verifyVendor", error);
      toast.error('Failed to verify vendor');
    }
  };

  // Create a typed similarity object with optional confidence
  const similarity = similarVendor ? {
    vendor_name: similarVendor.vendor_name,
    category: similarVendor.category,
    type: similarVendor.type,
    statement_type: similarVendor.statement_type,
    sample_description: similarVendor.sample_description,
    occurrences: similarVendor.occurrences,
    verified: similarVendor.verified,
    embedding: similarVendor.embedding,
    created_at: similarVendor.created_at,
    updated_at: similarVendor.updated_at,
    last_used: similarVendor.last_used,
    id: similarVendor.id,
    confidence: similarVendor.confidence
  } : null;

  // Use optional chaining and nullish coalescing for confidence
  const confidenceScore = similarVendor?.confidence ?? 0;
  // And safely access confidence with nullish coalescing
  const confidencePercent = Math.round((similarity?.confidence ?? 0) * 100);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewKeyword(e.target.value);
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Manage Keywords for {vendorName}</h3>
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="mb-4">
            <Label htmlFor="new-keyword">Add Keyword:</Label>
            <div className="flex mt-2">
              <Input
                type="text"
                id="new-keyword"
                placeholder="Enter keyword"
                value={newKeyword}
                onChange={handleInputChange}
                className="mr-2"
              />
              <Button onClick={handleAddKeyword}>Add Keyword</Button>
            </div>
          </div>
          
          {categorizations.length > 0 ? (
            <div className="mb-4">
              <h4 className="text-md font-semibold mb-2">Existing Keywords:</h4>
              <ul>
                {categorizations.map(cat => (
                  <li key={cat.id}>{cat.sample_description}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p>No keywords found for this vendor.</p>
          )}
          
          {similarVendor && (
            <div className="mb-4">
              <h4 className="text-md font-semibold mb-2">Similar Vendor:</h4>
              <p>Name: {similarVendor.vendor_name}</p>
              <p>Category: {similarVendor.category}</p>
              {/* Display other relevant details with optional chaining */}
              {similarity?.confidence !== undefined && (
                <p>Confidence: {confidencePercent}%</p>
              )}
            </div>
          )}
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose} className="mr-2">
              Cancel
            </Button>
            <Button onClick={handleVerifyVendor}>Verify Vendor</Button>
          </div>
        </>
      )}
    </div>
  );
};

export default VendorKeywordsList;
