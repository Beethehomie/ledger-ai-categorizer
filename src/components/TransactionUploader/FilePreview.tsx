
import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Transaction } from '@/types';

interface FilePreviewProps {
  file: File;
  previewData: Transaction[];
  onCancel: () => void;
  onUpload: () => void;
  isUploading: boolean;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ 
  file, 
  previewData, 
  onCancel, 
  onUpload,
  isUploading
}) => {
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
        <FileSpreadsheet className="h-10 w-10 text-green-600 dark:text-green-400" />
      </div>
      
      <div>
        <p className="text-lg font-medium">{file.name}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {(file.size / 1024).toFixed(2)} KB
        </p>
      </div>
      
      {previewData.length > 0 && (
        <div className="w-full overflow-x-auto">
          <p className="text-sm font-medium mb-2 text-left">Preview:</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Description</th>
                <th className="text-right p-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {previewData.map((row, index) => (
                <tr key={index} className="border-b">
                  <td className="p-2">{row.date}</td>
                  <td className="p-2 max-w-[200px] truncate">{row.description}</td>
                  <td className="p-2 text-right">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button 
          onClick={onUpload}
          disabled={isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload Transactions'}
        </Button>
      </div>
    </div>
  );
};
