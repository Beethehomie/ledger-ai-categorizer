
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AdminPage from './pages/AdminPage';
import Subscription from './pages/Subscription';
import Settings from './pages/Settings';
import BusinessInsight from './pages/BusinessInsight';
import TransactionUpload from './pages/TransactionUpload';
import ReconciliationDashboard from './pages/ReconciliationDashboard';
import VendorManagement from './pages/VendorManagement';
import FinancialReports from './pages/FinancialReports';
import { AuthProvider } from "@/context/AuthContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { RequireAuth } from "./components/RequireAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <SettingsProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<RequireAuth><Index /></RequireAuth>} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
              <Route path="/subscription" element={<RequireAuth><Subscription /></RequireAuth>} />
              <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
              <Route path="/business-insight" element={<RequireAuth><BusinessInsight /></RequireAuth>} />
              <Route path="/transaction-upload" element={<RequireAuth><TransactionUpload /></RequireAuth>} />
              <Route path="/reconciliation" element={<RequireAuth><ReconciliationDashboard /></RequireAuth>} />
              <Route path="/vendors" element={<RequireAuth><VendorManagement /></RequireAuth>} />
              <Route path="/reports" element={<RequireAuth><FinancialReports /></RequireAuth>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </SettingsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
