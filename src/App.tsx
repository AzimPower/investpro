import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { MobileNavBar } from "@/components/MobileNavBar";
import OfflinePage from "./components/OfflinePage";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { NotificationProvider } from "@/contexts/NotificationContext";

// Lazy loading des pages pour optimiser le bundle
const Home = lazy(() => import("./pages/Home").then(module => ({ default: module.Home })));
const Register = lazy(() => import("./pages/Register").then(module => ({ default: module.Register })));
const Login = lazy(() => import("./pages/Login").then(module => ({ default: module.Login })));
const Dashboard = lazy(() => import("./pages/Dashboard").then(module => ({ default: module.Dashboard })));
const Lots = lazy(() => import("./pages/Lots").then(module => ({ default: module.Lots })));
const History = lazy(() => import("./pages/History").then(module => ({ default: module.History })));
const Team = lazy(() => import("./pages/Team").then(module => ({ default: module.Team })));
const Profile = lazy(() => import("./pages/Profile").then(module => ({ default: module.Profile })));
const Withdraw = lazy(() => import("./pages/Withdraw").then(module => ({ default: module.Withdraw })));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminAgentApplications = lazy(() => import("./pages/AdminAgentApplications"));
const AgentDashboard = lazy(() => import("./pages/AgentDashboard"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminAgents = lazy(() => import("./pages/AdminAgents"));
const AdminDeposits = lazy(() => import("./pages/AdminDeposits"));
const AdminWithdrawals = lazy(() => import("./pages/AdminWithdrawals"));
const AdminLots = lazy(() => import("./pages/AdminLots"));
const AdminStats = lazy(() => import("./pages/AdminStats"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AgentWithdrawals = lazy(() => import("./pages/AgentWithdrawals"));
const AgentDeposits = lazy(() => import("./pages/AgentDeposits"));
const PolitiqueInvestissement = lazy(() => import("./pages/PolitiqueInvestissement").then(module => ({ default: module.PolitiqueInvestissement })));
const NotFound = lazy(() => import("./pages/NotFound"));

// Composant de loading uniforme
const LoadingSpinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
  </div>
);

// Configuration optimisée pour React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - les données restent fraîches
      gcTime: 10 * 60 * 1000, // 10 minutes - cache en mémoire
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    }
  },
});

const App = () => {
  const isOnline = useOnlineStatus();
  if (!isOnline) {
    return <OfflinePage />;
  }
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/lots" element={<Lots />} />
              <Route path="/history" element={<History />} />
              <Route path="/team" element={<Team />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/withdraw" element={<Withdraw />} />
              {/* Agent Routes */}
              <Route path="/agent/dashboard" element={<AgentDashboard />} />
              <Route path="/agent/withdrawals" element={<AgentWithdrawals />} />
              <Route path="/agent/deposits" element={<AgentDeposits />} />
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/agents" element={<AdminAgents />} />
              <Route path="/admin/deposits" element={<AdminDeposits />} />
              <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
              <Route path="/admin/lots" element={<AdminLots />} />
              <Route path="/admin/stats" element={<AdminStats />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/agent-applications" element={<AdminAgentApplications />} />
              {/* Politique d'investissement */}
              <Route path="/politique-investissement" element={<PolitiqueInvestissement />} />
              {/* La racine '/' sert directement de page d'accueil */}
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <MobileNavBar />
        </BrowserRouter>
      </TooltipProvider>
      </NotificationProvider>
    </QueryClientProvider>
  );
};

export default App;
