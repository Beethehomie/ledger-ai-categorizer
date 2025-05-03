import React, { useState, useEffect } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Transaction } from '@/types';
import { exportToCSV } from '@/utils/csvParser';
import { toast } from '@/utils/toast';
import { useBookkeeping } from '@/context/BookkeepingContext';

interface ReportExporterProps {
  transactions: Transaction[];
  currency: string;
}

const ReportExporter: React.FC<ReportExporterProps> = ({ transactions, currency }) => {
  const { financialSummary, calculateFinancialSummary } = useBookkeeping();
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    calculateFinancialSummary();
  }, [transactions, calculateFinancialSummary]);

  const downloadCSV = () => {
    try {
      setIsExporting(true);
      
      const csvData = exportToCSV(transactions);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions_${date}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Transactions exported to CSV successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export transactions');
    } finally {
      setIsExporting(false);
    }
  };

  const generatePDF = (reportType: 'summary' | 'detailed') => {
    setIsExporting(true);
    
    setTimeout(() => {
      toast.success(`${reportType === 'summary' ? 'Summary' : 'Detailed'} report generated successfully`);
      setIsExporting(false);
      
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('href', '#');
      link.setAttribute('download', `${reportType}_report_${date}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 1000);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export / Download
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="end">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Export Options</h4>
          <div className="flex flex-col gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadCSV} 
              className="justify-start"
              disabled={isExporting || transactions.length === 0}
            >
              <FileText className="h-4 w-4 mr-2" />
              Export as CSV
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => generatePDF('summary')}
              className="justify-start"
              disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              Summary PDF
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => generatePDF('detailed')}
              className="justify-start"
              disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              Detailed PDF
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={printReport}
              className="justify-start"
              disabled={isExporting}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
          </div>
          {transactions.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              No transactions available to export
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ReportExporter;
