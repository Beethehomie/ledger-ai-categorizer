
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TransactionUploadDialog from './TransactionUploadDialog';

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bankConnections: any[];
}

const UploadDialog: React.FC<UploadDialogProps> = ({ isOpen, onClose, bankConnections }) => {
  // This component now simply forwards to the more feature-complete TransactionUploadDialog
  return (
    <TransactionUploadDialog isOpen={isOpen} onClose={onClose} />
  );
};

export default UploadDialog;
