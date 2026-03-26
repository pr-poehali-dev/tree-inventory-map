import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import { useAuth } from "./hooks/useAuth";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 forest-bg rounded-xl flex items-center justify-center text-2xl animate-pulse">🌲</div>
          <p className="text-sm text-[var(--stone)]">Загрузка...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    if (user) { logout(); }
    else { setShowAuth(true); }
  };

  return (
    <>
      {showAuth && !user && (
        <AuthPage onSuccess={() => { setShowAuth(false); window.location.reload(); }} onClose={() => setShowAuth(false)} />
      )}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index user={user} onLogout={handleLogout} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppRoutes />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;