
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface BackToDashboardProps {
  className?: string;
}

export const BackToDashboard: React.FC<BackToDashboardProps> = ({ className }) => {
  const navigate = useNavigate();
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate('/')}
      className={`flex items-center gap-1 ${className || ''}`}
    >
      <ArrowLeft className="h-4 w-4" />
      <span>Back to Dashboard</span>
    </Button>
  );
};

export default BackToDashboard;
