import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { toast } from "@/utils/toast";
import { exportToCSV } from '@/utils/csvParser';
import { useSettings } from "@/context/SettingsContext";

interface ReportExporterProps {
  transactions: any[];
  defaultFilename?: string;
}

const ReportExporter: React.FC<ReportExporterProps> = ({ transactions, defaultFilename = 'transactions.csv' }) => {
  const [filename, setFilename] = useState(defaultFilename);
  const { currency } = useSettings();
  
  const handleExport = () => {
    try {
      const csvData = exportToCSV(transactions, filename);
      
      if (!csvData) {
        toast.error('Failed to generate CSV data');
        return;
      }
      
      // Create a blob and download link
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      // Set up download
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      
      // Append to document, trigger download and clean up
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${transactions.length} transactions to ${filename}`);
    } catch (error) {
      console.error('Error in handleExport:', error);
      toast.error('Failed to export file');
    }
  };
  
  return (
    <div className="flex items-center space-x-4">
      <div className="flex-1">
        <Label htmlFor="filename">Filename</Label>
        <Input
          id="filename"
          type="text"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          placeholder="Enter filename"
        />
      </div>
      <Button onClick={handleExport} className="bg-finance-green hover:bg-finance-green-light hover-scale">
        Export CSV <Download className="ml-2" />
      </Button>
    </div>
  );
};

export default ReportExporter;
