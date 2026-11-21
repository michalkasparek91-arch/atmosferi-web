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
import { usePushNotificationPrompt } from "@/hooks/use-push-notification-prompt";

const sidebarLinks = [
  { label: "Přehled", href: "/", icon: LayoutDashboard },
  { label: "Faktury", href: "/faktury", icon: ScrollText },
  { label: "Kontakty", href: "/kontakty", icon: Users },
  { label: "Vizualizace", href: "/vizualizace", icon: FolderTree },
  { label: "Kampaně", href: "/emaily", icon: Mail },
  { label: "Statistiky", href: "/statistiky", icon: BarChart3 },
  { label: "SEO & Google", href: "/seo", icon: Search },
];

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="h-[100dvh] flex bg-[#f4f4f4] overflow-hidden">
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
        "fixed lg:static inset-y-0 right-0 lg:left-0 lg:right-auto z-50 w-full lg:w-60 bg-[#f4f4f4] transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex-shrink-0",
        sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 h-[88px] flex items-center">
            <div className="flex items-center justify-between w-full">
              <Link to="/" className="flex items-baseline gap-2 hover:opacity-70 transition-opacity" aria-label="Atmosferi admin">
                <span className="lg text-[26px] font-medium tracking-[-0.04em] text-foreground"><span className="lg-t" aria-hidden="true">atmosferı</span><i className="lg-o" aria-hidden="true" /></span>
                <span className="text-[12px] text-muted-foreground">admin</span>
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
          <nav className="flex-1 flex flex-col gap-1 px-3 py-2 overflow-y-auto">
            {sidebarLinks.map((link) => {
              const isActive = link.href === "/" ? location.pathname === "/" : location.pathname.startsWith(link.href) || (link.href === "/emaily" && location.pathname.startsWith("/agentury"));
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-full transition-colors text-[15px] font-medium",
                    isActive
                      ? "bg-foreground text-white"
                      : "text-foreground/70 hover:bg-white hover:text-foreground"
                  )}
                >
                  <link.icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
                  <span className="leading-snug">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-1 px-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
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
              className="flex items-center gap-3 px-4 py-2 rounded-full text-muted-foreground hover:bg-white hover:text-foreground transition-colors text-[13px]"
            >
              <Home className="h-4 w-4" />
              Zpět na web
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-full text-muted-foreground hover:bg-white hover:text-foreground transition-colors text-[13px]"
            >
              <LogOut className="h-4 w-4" />
              Odhlásit se
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[#f4f4f4]">
        {/* Mobile header */}
        <header className="lg:hidden flex-shrink-0 bg-[#f4f4f4] px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="lg text-[22px] font-medium tracking-[-0.04em]"><span className="lg-t" aria-hidden="true">atmosferı</span><i className="lg-o" aria-hidden="true" /><span className="sr-only">Atmosferi admin</span></span>
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
        <main className="flex-1 p-4 md:p-6 lg:py-8 lg:pl-4 lg:pr-8 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] admin-chic-theme">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
