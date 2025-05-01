
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/hooks/auth';
import { BookkeepingProvider } from '@/context/BookkeepingContext';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { VendorManagement } from '@/components/admin/VendorManagement';
import { ClientsManagement } from '@/components/admin/ClientsManagement';
import { AdminTodoList } from '@/components/admin/AdminTodoList';
import { SystemStats } from '@/components/admin/SystemStats';
import UploadDialog from '@/components/UploadDialog';

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  
  // Check if user is admin (email is terramultaacc@gmail.com)
  const isAdmin = user?.email === 'terramultaacc@gmail.com';
  
  if (!user || !isAdmin) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Admin Access Restricted</h2>
        <p>This page is only accessible to authorized administrators.</p>
        <Button 
          className="mt-4"
          onClick={() => navigate('/')}
        >
          <Home className="h-4 w-4 mr-2" />
          Return to Dashboard
        </Button>
      </div>
    );
  }
  
  return (
    <BookkeepingProvider>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/')} className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Return to Dashboard
            </Button>
            <Button onClick={() => setIsUploadDialogOpen(true)} variant="outline" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload CSV
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="dashboard" className="mb-8">
          <TabsList className="mb-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="clients">Clients Management</TabsTrigger>
            <TabsTrigger value="vendors">Vendor Management</TabsTrigger>
            <TabsTrigger value="todo">To-Do List</TabsTrigger>
            <TabsTrigger value="stats">System Stats</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard">
            <AdminDashboard />
          </TabsContent>
          
          <TabsContent value="clients">
            <ClientsManagement />
          </TabsContent>
          
          <TabsContent value="vendors">
            <VendorManagement />
          </TabsContent>
          
          <TabsContent value="todo">
            <AdminTodoList />
          </TabsContent>
          
          <TabsContent value="stats">
            <SystemStats />
          </TabsContent>
        </Tabs>
        
        <UploadDialog 
          isOpen={isUploadDialogOpen} 
          onClose={() => setIsUploadDialogOpen(false)} 
        />
      </div>
    </BookkeepingProvider>
  );
};

export default AdminPage;
