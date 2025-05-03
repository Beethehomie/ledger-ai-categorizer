
import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, File } from "lucide-react";
import { validateCSVStructure, findDuplicateTransactions } from '@/utils/csvParser';

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  accept?: string;
  multiple?: boolean;
  currentFile?: File | null;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelected,
  accept = '.csv,.xls,.xlsx',
  multiple = false,
  currentFile
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // If multiple is true, pass all files, otherwise just pass the first file
      if (multiple) {
        // Handle multiple files if needed
        const filesArray = Array.from(e.target.files);
        onFileSelected(filesArray[0]);
      } else {
        onFileSelected(e.target.files[0]);
      }
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // If multiple is true, pass all files, otherwise just pass the first file
      if (multiple) {
        // Handle multiple files if needed
        const filesArray = Array.from(e.dataTransfer.files);
        onFileSelected(filesArray[0]);
      } else {
        onFileSelected(e.dataTransfer.files[0]);
      }
    }
  };
  
  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${
          isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {currentFile ? (
          <div className="flex flex-col items-center justify-center">
            <File className="h-10 w-10 text-primary mb-2" />
            <p className="font-medium text-primary">{currentFile.name}</p>
            <p className="text-sm text-gray-500 mt-1">
              {(currentFile.size / 1024).toFixed(2)} KB
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <Upload className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-gray-600">Drag and drop your file here, or click to browse</p>
            <p className="text-sm text-gray-500 mt-1">
              Accepted formats: {accept}
            </p>
          </div>
        )}
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        accept={accept}
        multiple={multiple}
      />
    </div>
  );
};

export default FileUpload;
