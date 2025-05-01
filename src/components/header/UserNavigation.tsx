
import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/auth";
import { Settings, LogOut, Upload, User } from "lucide-react";
import UploadDialog from "@/components/UploadDialog";
import { useBookkeeping } from "@/context/BookkeepingContext";

export const UserNavigation = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { bankConnections } = useBookkeeping();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  
  if (!user) {
    return (
      <Button variant="ghost" onClick={() => navigate('/auth')}>
        Sign In
      </Button>
    );
  }
  
  const initials = user.email ? user.email.substring(0, 2).toUpperCase() : "U";
  
  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsUploadDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          <span className="hidden md:inline">Upload CSV</span>
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" alt={user.email || "User"} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.email}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  User Account
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/subscription" className="flex items-center cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Account</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={async () => {
                await signOut();
                navigate('/auth');
              }}
              className="flex items-center cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <UploadDialog 
        isOpen={isUploadDialogOpen} 
        onClose={() => setIsUploadDialogOpen(false)} 
        bankConnections={bankConnections}
      />
    </>
  );
};

export default UserNavigation;
