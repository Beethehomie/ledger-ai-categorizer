
import React from 'react';
import DashboardComponent from '../components/Dashboard';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DashboardPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-semibold mb-4">Your Financial Dashboard</h1>
      
      <Card className="shadow-lg animate-fade-in">
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <DashboardComponent />
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
