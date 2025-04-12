
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, FileSpreadsheet, AlertCircle, ArrowRight } from "lucide-react";
import { useBookkeeping } from '@/context/BookkeepingContext';
import { toast } from '@/utils/toast';
import { BankConnectionRow } from '@/types/supabase';

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bankConnections: BankConnectionRow[];
}

const UploadDialog: React.FC<UploadDialogProps> = ({ isOpen, onClose, bankConnections }) => {
  const { uploadCSV, loading } = useBookkeeping();
  const [step, setStep] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string>('');

  // Get CSV-type bank connections
  const csvBankConnections = bankConnections.filter(conn => conn.connection_type === 'csv');

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
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }
    
    if (!selectedBankId) {
      toast.error('Please select a bank account for this upload');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === 'string') {
        uploadCSV(event.target.result, selectedBankId);
        resetDialog();
        onClose();
      }
    };
    reader.readAsText(selectedFile);
  };

  const nextStep = () => {
    setStep(2);
  };

  const resetDialog = () => {
    setStep(1);
    setSelectedFile(null);
    setSelectedBankId('');
    setDragActive(false);
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary">Upload Bank Statement</DialogTitle>
          <DialogDescription>
            {step === 1 
              ? "CSV file must include these columns: Date, Description, Amount" 
              : "Select the bank account for this statement upload"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center ${
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
                  id="file-upload-dialog"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('file-upload-dialog')?.click()}
                  className="hover-scale"
                >
                  Browse Files
                </Button>
              </div>
            </div>

            {selectedFile && (
              <div className="mt-2 p-3 border rounded-md bg-background">
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

            <div className="flex items-center space-x-2 text-sm text-amber-500">
              <AlertCircle className="h-4 w-4" />
              <p>Required columns: Date, Description, Amount</p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={nextStep} 
                disabled={!selectedFile}
                className="bg-finance-green hover:bg-finance-green-light"
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-2">
              <p className="text-sm font-medium">Select Bank Account</p>
              
              {csvBankConnections.length > 0 ? (
                <Select
                  value={selectedBankId}
                  onValueChange={setSelectedBankId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {csvBankConnections.map((conn) => (
                      <SelectItem key={conn.id} value={conn.id}>
                        {conn.display_name || conn.bank_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-center p-4 border border-dashed rounded-md">
                  <p className="text-muted-foreground">No CSV bank accounts available.</p>
                  <p className="text-sm mt-2">Add a CSV bank connection in the Banking tab first.</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={processFile}
                disabled={!selectedBankId || loading}
                className="bg-finance-green hover:bg-finance-green-light"
              >
                {loading ? 'Processing...' : 'Upload & Process'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UploadDialog;
