import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Buyer Pages
import BuyerHome from "./pages/buyer/BuyerHome";
import BuyerCompanies from "./pages/buyer/BuyerCompanies";
import BuyerBids from "./pages/buyer/BuyerBids";
import BuyerBidsHistory from "./pages/buyer/BuyerBidsHistory";
import BuyerProfile from "./pages/buyer/BuyerProfile";
import BuyerSettings from "./pages/buyer/BuyerSettings";

// Seller Pages
import SellerDashboard from "./pages/seller/SellerDashboard";
import SellerMaterials from "./pages/seller/SellerMaterials";
import SellerBids from "./pages/seller/SellerBids";
import SellerProfile from "./pages/seller/SellerProfile";
import SellerSettings from "./pages/seller/SellerSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          
          {/* Buyer Routes */}
          <Route path="/buyer/home" element={<BuyerHome />} />
          <Route path="/buyer/companies" element={<BuyerCompanies />} />
          <Route path="/buyer/bids" element={<BuyerBids />} />
          <Route path="/buyer/bids/history" element={<BuyerBidsHistory />} />
          <Route path="/buyer/profile" element={<BuyerProfile />} />
          <Route path="/buyer/settings" element={<BuyerSettings />} />
          
          {/* Seller Routes */}
          <Route path="/seller/dashboard" element={<SellerDashboard />} />
          <Route path="/seller/materials" element={<SellerMaterials />} />
          <Route path="/seller/bids" element={<SellerBids />} />
          <Route path="/seller/profile" element={<SellerProfile />} />
          <Route path="/seller/settings" element={<SellerSettings />} />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
