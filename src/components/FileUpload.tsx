
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle, Cpu } from "lucide-react";
import { useBookkeeping } from '@/context/BookkeepingContext';
import { toast } from '@/utils/toast';
import TransactionUploadDialog from './TransactionUploadDialog';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const FileUpload: React.FC = () => {
  const { bankConnections } = useBookkeeping();
  const [dragActive, setDragActive] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
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
    
    // Open the upload dialog when a file is dropped
    setIsDialogOpen(true);
  };

  const openUploadDialog = () => {
    setIsDialogOpen(true);
  };

  const closeUploadDialog = () => {
    setIsDialogOpen(false);
  };

  return (
    <>
      <Card className="w-full hover:shadow-md transition-all">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <UploadCloud className="h-5 w-5" />
            Upload Bank Statement
          </CardTitle>
          <CardDescription>
            Upload a CSV file containing bank statement data to categorize transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              dragActive ? 'border-primary bg-secondary/50' : 'border-muted'
            } transition-colors duration-200 ease-in-out`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-3 rounded-full bg-primary/10">
                <UploadCloud className={`h-10 w-10 text-primary ${dragActive ? 'animate-bounce-subtle' : ''}`} />
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
                onChange={() => openUploadDialog()}
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
                className="hover-scale"
              >
                Browse Files
              </Button>
              <Button
                variant="default"
                className="bg-finance-green hover:bg-finance-green-light hover-scale"
                onClick={openUploadDialog}
              >
                Upload CSV Transactions
              </Button>
            </div>
          </div>

          <div className="mt-6 flex items-center text-sm space-x-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p>CSV file should include date, description, and amount columns</p>
          </div>
        </CardContent>
      </Card>

      <TransactionUploadDialog 
        isOpen={isDialogOpen} 
        onClose={closeUploadDialog} 
      />
    </>
  );
};

export default FileUpload;
