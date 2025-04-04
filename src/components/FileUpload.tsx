import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileSpreadsheet, AlertCircle } from "lucide-react";
import { useBookkeeping } from '@/context/BookkeepingContext';
import { toast } from '@/utils/toast';

const FileUpload: React.FC = () => {
  const { uploadCSV, loading } = useBookkeeping();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFile(file);
    }
  };

  const handleFile = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    
    setSelectedFile(file);
  };

  const processFile = () => {
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === 'string') {
        uploadCSV(event.target.result);
        setSelectedFile(null);
      }
    };
    reader.readAsText(selectedFile);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-finance-blue">Upload Bank Statement</CardTitle>
        <CardDescription>
          Upload a CSV file containing bank statement data to categorize transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            dragActive ? 'border-primary bg-secondary/50' : 'border-gray-300'
          } transition-colors duration-200 ease-in-out`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-3 rounded-full bg-primary/10">
              <UploadCloud className="h-10 w-10 text-finance-blue" />
            </div>
            <div>
              <p className="text-lg font-medium">Drag and drop your CSV file here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse files</p>
            </div>
            <input
              id="file-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              Browse Files
            </Button>
          </div>
        </div>

        {selectedFile && (
          <div className="mt-4 p-4 border rounded-md bg-background">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="h-5 w-5 text-finance-green" />
              <div className="flex-1 truncate">
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setSelectedFile(null)}>
                Remove
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center text-sm space-x-2 text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <p>CSV file should include date, description, and amount columns</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          onClick={processFile}
          disabled={!selectedFile || loading}
          className="bg-finance-green hover:bg-finance-green-light"
        >
          {loading ? 'Processing...' : 'Process Transactions'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FileUpload;
