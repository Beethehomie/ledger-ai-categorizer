
import React from 'react';
import { HeroSection } from '@/components/ui/hero-section';
import Dashboard from '@/components/Dashboard';

const Home = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      <Dashboard />
    </div>
  );
};

export default Home;
