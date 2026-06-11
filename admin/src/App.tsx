import React, { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { SessionProvider } from "./providers/SessionProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import PageLoader from "./components/PageLoader";

// Imports
const Auth = React.lazy(() => import("./pages/Auth"));
const AdminLayout = React.lazy(() => import("./layouts/AdminLayout").then(m => ({ default: m.AdminLayout })));
const ProtectedAdminRoute = React.lazy(() => import("./components/ProtectedAdminRoute").then(m => ({ default: m.ProtectedAdminRoute })));
const AdminDashboard = React.lazy(() => import("./pages/admin/AdminDashboard"));
const AdminEmails = React.lazy(() => import("./pages/admin/AdminEmails"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 15,
      gcTime: 1000 * 60 * 15,
      retry: 2,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: 'always',
    },
  },
});

function GlobalAuthListener() {
  const queryClient = useQueryClient();
  useEffect(() => {
    let cancelled = false;
    let subscription: any;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      if (cancelled) return;
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        queryClient.setQueryData(['auth-session'], session);
      });
      subscription = data.subscription;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!cancelled && session) {
          queryClient.setQueryData(['auth-session'], session);
        }
      });
    });
    return () => {
      cancelled = true;
      if (subscription) subscription.unsubscribe();
    };
  }, [queryClient]);
  return null;
}

const App = () => {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <GlobalAuthListener />
        <SessionProvider>
          {/* We set basename to /admin so all links start from here */}
          <BrowserRouter basename="/admin">
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <ErrorBoundary>
                <main>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Public routes */}
                      <Route path="/prihlaseni" element={<Auth />} />
                        <Route path="/nabidka/:id" element={<ProposalView />} />
                      
                      {/* Admin routes */}
                      <Route element={<ProtectedAdminRoute />}>
                        <Route element={<AdminLayout />}>
                          <Route path="/" element={<AdminDashboard />} />
                          <Route path="/emaily/*" element={<AdminEmails />} />
                        </Route>
                      </Route>
                      
                      <Route path="*" element={<Navigate to="/prihlaseni" replace />} />
                    </Routes>
                  </Suspense>
                </main>
              </ErrorBoundary>
            </TooltipProvider>
          </BrowserRouter>
        </SessionProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
