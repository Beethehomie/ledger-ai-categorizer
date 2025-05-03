
import React from 'react';
import MainNavigation from '@/components/MainNavigation';
import { UserNavigation } from '@/components/header/UserNavigation';

const Index = () => {
  return (
    <div className="min-h-screen">
      <header className="border-b flex justify-between items-center px-6 py-3">
        <h1 className="text-2xl font-bold">Bookkeeping AI</h1>
        <UserNavigation />
      </header>
      
      <MainNavigation />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        {/* Dashboard content here */}
      </main>
    </div>
  );
};

export default Index;
