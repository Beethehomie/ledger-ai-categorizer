
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckSquare, Settings, LogOut, User } from 'lucide-react';
import BusinessContextQuestionnaire from '../business/BusinessContextQuestionnaire';
import { BusinessContextFormValues } from '../business/BusinessContextQuestionnaire';

export const UserNavigation = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false);
  
  if (!session) return null;
  
  const userInitials = session.user.email 
    ? session.user.email.substring(0, 2).toUpperCase()
    : "NA";
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    }
  };
  
  const handleQuestionnaireComplete = (data: BusinessContextFormValues) => {
    toast.success('Business context updated successfully');
    setIsQuestionnaireOpen(false);
  };
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => navigate('/profile')}
          >
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => setIsQuestionnaireOpen(true)}
          >
            <CheckSquare className="mr-2 h-4 w-4" />
            Business Context
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => navigate('/settings')}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={handleLogout}
            className="cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <BusinessContextQuestionnaire 
        isOpen={isQuestionnaireOpen}
        onClose={() => setIsQuestionnaireOpen(false)}
        onComplete={handleQuestionnaireComplete}
      />
    </>
  );
};

export default UserNavigation;
