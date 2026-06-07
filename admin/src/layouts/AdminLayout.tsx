import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  LogOut,
  Menu,
  X,
  Bell,
  Mail,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  ScrollText,
  Star,
  Settings,
  Ticket,
  Home,
  FolderTree,
  Search,
  Zap,
  Inbox,
  BookOpen,
  Globe,
  CreditCard,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { AdminBreadcrumbs } from "@/components/admin/AdminBreadcrumbs";
import { AdminCommandPalette } from "@/components/admin/AdminCommandPalette";
import { DarkModeToggle } from "@/components/admin/DarkModeToggle";
import AddToHomeScreen from "@/components/AddToHomeScreen";
import { usePushNotificationPrompt } from "@/hooks/use-push-notification-prompt";

const sidebarLinks = [
  { label: "Přehled", href: "/", icon: LayoutDashboard },
  { label: "Kampaně", href: "/emaily", icon: Mail },
];

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pwaPromptDismissed, setPwaPromptDismissed] = useState(() => {
    return window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
  });

  // Sync existing push permission (no prompt)
  usePushNotificationPrompt();

  useEffect(() => {
    document.body.classList.add("admin-mode");
    return () => {
      document.body.classList.remove("admin-mode");
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  useEffect(() => {
    // Basic setup if any is needed in the future
  }, [navigate]);

  return (
    <div className="h-[100dvh] flex bg-background overflow-hidden transition-colors duration-300">
      <AdminCommandPalette />
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 right-0 lg:left-0 lg:right-auto z-50 w-full lg:w-64 bg-white dark:bg-zinc-950 border-l lg:border-r border-border transform transition-all duration-300 ease-in-out lg:translate-x-0 flex-shrink-0",
        sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-5 h-[100px] flex items-center mb-4 border-b border-border transition-all">
            <div className="flex items-center justify-between w-full">
              <Link 
                to="/" 
                className="flex flex-col items-start lg:items-end hover:opacity-80 transition-opacity translate-y-2 lg:-translate-x-2"
              >
                <span className="text-lg font-black tracking-widest text-foreground dark:text-white uppercase">Atmosferi</span>
                <span className="text-[9px] font-black tracking-[0.2em] text-foreground/50 dark:text-primary leading-none mt-1 uppercase">Admin</span>
              </Link>
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden text-muted-foreground hover:bg-muted"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 flex flex-col justify-between px-3 py-2 overflow-y-auto">
            {sidebarLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition-all text-xs font-semibold group",
                    isActive 
                      ? "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-white shadow-sm font-bold" 
                      : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <link.icon className={cn(
                    "h-4 w-4 flex-shrink-0 transition-transform group-hover:scale-110",
                    isActive ? "text-zinc-900 dark:text-white" : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white"
                  )} />
                  <span className="leading-snug">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-border flex-shrink-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <DarkModeToggle />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                onClick={() => {
                  const event = new KeyboardEvent("keydown", { key: "k", metaKey: true });
                  document.dispatchEvent(event);
                }}
              >
                <Search className="h-3.5 w-3.5" />
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  ⌘K
                </kbd>
              </Button>
            </div>
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-1.5 rounded-full text-muted-foreground/60 hover:bg-muted hover:text-muted-foreground transition-colors text-[12px] font-medium mb-1"
            >
              <Home className="h-4 w-4" />
              Zpět na web
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-red-500/70 hover:bg-red-500/10 hover:text-red-500 transition-colors text-[12px] font-medium"
            >
              <LogOut className="h-4 w-4" />
              Odhlásit se
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white dark:bg-background">
        {/* Mobile header */}
        <header className="lg:hidden flex-shrink-0 bg-background border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-start translate-y-1">
              <span className="text-sm font-black tracking-widest text-foreground dark:text-white uppercase">Atmosferi</span>
              <span className="text-[8px] font-medium tracking-wider text-[#213319] dark:text-primary leading-none mt-0.5">ADMIN</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-muted-foreground hover:bg-muted"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Page content - scrollable area */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] admin-chic-theme">
          <Outlet />
        </main>
      </div>

      {/* PWA Install Prompt (shows first) */}
      <AddToHomeScreen onDismissed={() => setPwaPromptDismissed(true)} />
    </div>
  );
}
