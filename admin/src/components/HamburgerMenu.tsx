import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  Menu, 
  Moon, 
  Sun, 
  LogIn,
  UserPlus,
  LayoutGrid,
  RefreshCw, 
  Lightbulb, 
  Briefcase, 
  LifeBuoy, 
  ScrollText, 
  DoorOpen,
  ChevronRight,
  Repeat,
  X,
  SlidersHorizontal,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
const getSupabase = () => import("@/integrations/supabase/client").then(m => m.supabase);
import { hapticTap } from "@/utils/haptics";
import { APP_VERSION, COPYRIGHT_YEAR } from "@/config/version";
import { useProfile } from "@/hooks/use-profile";
import { usePwaInstallPrompt, triggerInstall } from "@/hooks/use-pwa-install-prompt";
import { AddToHomeScreenModal } from "@/components/AddToHomeScreenModal";
import { toast } from "sonner";

interface HamburgerMenuProps {
  onLoginClick?: () => void;
  onRegisterClick?: () => void;
  onThemeToggle?: () => void;
  isDark?: boolean;
}

export function HamburgerMenu({ onLoginClick, onRegisterClick, onThemeToggle, isDark }: HamburgerMenuProps = {}) {
  const [open, setOpen] = useState(false);
  const { profile, isLoading: profileLoading } = useProfile();
  const [isDarkMode, setIsDarkMode] = useState(() => 
    document.documentElement.classList.contains('dark')
  );
  const navigate = useNavigate();
  const location = useLocation();

  const user = profile;
  const userType = profile?.user_type || null;
  const isAdmin = false; // Admin check would need separate query if needed
  
  // Determine current context based on route, then sessionStorage, then stored userType
  const isWorkerRoute = location.pathname.startsWith('/remeslnik');
  const isCustomerRoute = location.pathname.startsWith('/zakaznik');
  const lastContext = sessionStorage.getItem('lastContext');
  const currentContext = isWorkerRoute ? 'worker' : isCustomerRoute ? 'customer' : (lastContext || userType);
  
  const { isInstalled, isIOSDevice } = usePwaInstallPrompt(true);
  const [showIosModal, setShowIosModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  
  const isInfoPage = ['/o-nas', '/jak-to-funguje', '/kariera', '/ochrana-udaju', '/podminky', '/podpora', '/', '/nova-poptavka', '/registrace-remeslnika', '/prihlaseni'].includes(location.pathname);


  // Check admin status and worker registration separately
  const [isAdminState, setIsAdminState] = useState(false);
  const [isWorkerRegistered, setIsWorkerRegistered] = useState(false);
  useEffect(() => {
    if (!profile?.id) { setIsAdminState(false); setIsWorkerRegistered(false); return; }
    getSupabase().then(supabase => {
      supabase.from('profiles').select('is_admin').eq('id', profile.id).single()
        .then(({ data }) => setIsAdminState(data?.is_admin === true));
      supabase.from('worker_services').select('id').eq('worker_id', profile.id).limit(1)
        .then(({ data }) => setIsWorkerRegistered(!!data && data.length > 0));
    });
  }, [profile?.id]);

  const toggleDarkMode = () => {
    hapticTap();
    if (onThemeToggle) {
      onThemeToggle();
      setIsDarkMode(!isDarkMode);
      return;
    }
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    if (typeof isDark === 'boolean') setIsDarkMode(isDark);
  }, [isDark]);

  const handleSignOut = async () => {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
    setOpen(false);
    navigate('/');
  };

  const handleSwitchAccount = async () => {
    hapticTap();
    if (!profile) {
      navigate('/registrace-remeslnika', { state: { from: location.pathname } });
      setOpen(false);
      return;
    }

    const supabase = await getSupabase();
    // Switch based on current context (route), not stored userType
    const newType = currentContext === 'worker' ? 'customer' : 'worker';

    // Navigate optimistically first
    setOpen(false);

    if (newType === 'worker') {
      navigate('/remeslnik/hledej');
      // Check onboarding in background; redirect if incomplete
      const [profileResult, servicesResult] = await Promise.all([
        supabase.from('profiles').select('phone, company_type').eq('id', profile.id).single(),
        supabase.from('worker_services').select('id').eq('worker_id', profile.id)
      ]);
      if (!profileResult.data?.phone || !profileResult.data?.company_type ||
          !servicesResult.data || servicesResult.data.length === 0) {
        navigate('/registrace-remeslnika', { replace: true });
        return;
      }
    } else {
      navigate('/zakaznik/nova-zakazka');
    }

    // Fire-and-forget profile update
    supabase.from('profiles').update({ user_type: newType }).eq('id', profile.id);
  };

  const handleInstallClick = async () => {
    if (isInstalling) return;

    hapticTap();
    if (isIOSDevice) {
      setShowIosModal(true);
      return;
    }

    setIsInstalling(true);
    try {
      const result = await triggerInstall();
      if (!result.success) {
        if (isIOSDevice) {
          setShowIosModal(true);
        } else {
          toast.info("Zkuste to znovu za chvíli", {
            description: "Prohlížeč zatím nepřipravil instalaci. Zkuste to prosím za okamžik.",
          });
        }
      }
    } finally {
      setIsInstalling(false);
    }
  };


  const getInitials = () => {
    if (!profile?.full_name) return "U";
    return profile.full_name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isLoggedIn = !!profile;

  return (
    <>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="h-10 w-10 rounded-full p-0 bg-card">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="right" 
        hideCloseButton
        className="w-full sm:w-80 p-0 border-l border-border bg-white dark:bg-background text-black dark:text-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right [&_svg]:text-black dark:[&_svg]:text-foreground"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <span className="text-base font-semibold">Menu</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpen(false)}
              className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-4 w-4 text-foreground" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto h-[calc(100vh-180px)] px-4">
          {/* Profile Card - for logged in users */}
          {isLoggedIn && profile && (
            <button
              onClick={() => {
                navigate(currentContext === 'worker' ? '/remeslnik/profil' : '/zakaznik/profil');
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-muted/50 hover:bg-muted transition-colors mb-5"
            >
              <Avatar className="h-12 w-12 border-2 border-primary/30">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">{profile.full_name || "Uživatel"}</p>
                <p className="text-xs text-muted-foreground">
                  {currentContext === 'worker' ? 'Certifikovaný profík' : 'Zákazník'}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-foreground" />
            </button>
          )}

          {/* Main Navigation - for logged in users */}
          {isLoggedIn && !isInfoPage && (
            <div className="mb-5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                Hlavní
              </p>
              <div className="space-y-0.5">
                <button
                  onClick={handleSwitchAccount}
                  className="w-full flex items-center gap-3 py-2.5 px-3 text-foreground hover:bg-muted/50 rounded-xl transition-colors text-sm font-medium border-0 shadow-none"
                >
                  <Repeat className="h-4 w-4" strokeWidth={1.75} />
                  {currentContext === 'worker' ? 'Přepnout na zákazníka' : (isWorkerRegistered ? 'Přepnout na pracovníka' : 'Stát se pracovníkem')}
                </button>
                <Link
                  to={currentContext === 'worker' ? '/remeslnik/nastaveni' : '/zakaznik/nastaveni'}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 py-2.5 px-3 text-foreground hover:bg-muted/50 rounded-xl transition-colors text-sm font-medium"
                >
                  <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />
                  Nastavení
                </Link>
              </div>
            </div>
          )}

          {!isLoggedIn && (onLoginClick || onRegisterClick) && (
            <div className="mb-5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                Účet
              </p>
              <div className="space-y-0.5">
                {onLoginClick && (
                  <button
                    onClick={() => {
                      setOpen(false);
                      onLoginClick();
                    }}
                    className="w-full flex items-center gap-3 py-2.5 px-3 text-foreground hover:bg-muted/50 rounded-xl transition-colors text-sm font-medium"
                  >
                    <LogIn className="h-4 w-4" strokeWidth={1.75} />
                    Přihlášení
                  </button>
                )}
                {onRegisterClick && (
                  <button
                    onClick={() => {
                      setOpen(false);
                      onRegisterClick();
                    }}
                    className="w-full flex items-center gap-3 py-2.5 px-3 text-foreground hover:bg-muted/50 rounded-xl transition-colors text-sm font-medium"
                  >
                    <UserPlus className="h-4 w-4" strokeWidth={1.75} />
                    Registrace
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="mb-5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Zobrazení
            </p>
            <button
              onClick={toggleDarkMode}
              className="w-full flex items-center gap-3 py-2.5 px-3 text-foreground hover:bg-muted/50 rounded-xl transition-colors text-sm font-medium"
            >
              {isDarkMode ? <Sun className="h-4 w-4" strokeWidth={1.75} /> : <Moon className="h-4 w-4" strokeWidth={1.75} />}
              {isDarkMode ? 'Světlý režim' : 'Tmavý režim'}
            </button>
          </div>

          {/* Company Section */}
          <div className="mb-5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Společnost
            </p>
            <div className="space-y-0.5">
              <Link
                to="/o-nas"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 py-2.5 px-3 text-foreground hover:bg-muted/50 rounded-xl transition-colors text-sm"
              >
                <Lightbulb className="h-4 w-4" strokeWidth={1.75} />
                O nás
              </Link>
              <Link
                to="/kariera"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between py-2.5 px-3 text-foreground hover:bg-muted/50 rounded-xl transition-colors text-sm"
              >
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4" />
                  Kariéra
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-primary/20 text-primary uppercase">
                  Hledáme
                </span>
              </Link>
            </div>
          </div>

          {/* Support & Legal Section */}
          <div className="mb-5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Podpora & Právní
            </p>
            <div className="space-y-0.5">
              <Link
                to="/podpora"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 py-2.5 px-3 text-foreground hover:bg-muted/50 rounded-xl transition-colors text-sm"
              >
                <LifeBuoy className="h-4 w-4" strokeWidth={1.75} />
                Nápověda
              </Link>
              <Link
                to="/podminky"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 py-2.5 px-3 text-foreground hover:bg-muted/50 rounded-xl transition-colors text-sm"
              >
                <ScrollText className="h-4 w-4" strokeWidth={1.75} />
                Obchodní podmínky
              </Link>
              <Link
                to="/ochrana-udaju"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 py-2.5 px-3 text-foreground hover:bg-muted/50 rounded-xl transition-colors text-sm"
              >
                <ScrollText className="h-4 w-4" strokeWidth={1.75} />
                Ochrana osobních údajů
              </Link>
              <Link
                to="/jak-to-funguje"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 py-2.5 px-3 text-foreground hover:bg-muted/50 rounded-xl transition-colors text-sm"
              >
                <Lightbulb className="h-4 w-4" strokeWidth={1.75} />
                Jak to funguje
              </Link>
            </div>
          </div>

          {/* Installation Section - only if not installed */}
          {!isInstalled && (
            <div className="mb-6 px-1">
              <button
                onClick={handleInstallClick}
                disabled={isInstalling}
                aria-busy={isInstalling}
                className="w-full flex items-center justify-between py-3 px-4 bg-[#F2F2F7] dark:bg-muted/40 hover:bg-muted transition-all text-foreground rounded-full border border-border/50 shadow-sm active:scale-[0.98] disabled:pointer-events-none disabled:opacity-80"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-background flex items-center justify-center shadow-sm border border-border/20">
                    {isInstalling ? <RefreshCw className="h-5 w-5 text-primary animate-spin" /> : <Download className="h-5 w-5 text-primary" />}
                  </div>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[13px] font-bold">{isInstalling ? 'Kontroluji instalaci' : 'Nainstalovat aplikaci'}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{isInstalling ? 'Čekám na nativní výzvu prohlížeče' : 'Získat Zrobee do mobilu'}</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 opacity-30" />
              </button>
            </div>
          )}

          {/* Admin link */}
          {isAdminState && (
            <div className="mb-5">
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 py-2.5 px-3 text-foreground hover:bg-muted/50 rounded-xl transition-colors text-sm"
              >
                <LayoutGrid className="h-4 w-4" strokeWidth={1.75} />
                Admin Panel
              </Link>
            </div>
          )}
        </div>

        {/* Footer - Logout button */}
        {isLoggedIn && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-background border-t border-border">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 text-destructive border border-destructive/30 hover:bg-destructive/10 rounded-full transition-colors text-sm font-medium"
            >
              <DoorOpen className="h-4 w-4" strokeWidth={1.75} />
              Odhlásit se
            </button>
            <p className="text-center text-[10px] text-muted-foreground mt-3">
              VERZE {APP_VERSION} — © {COPYRIGHT_YEAR} ZROBEE
            </p>
          </div>
        )}

        {/* Footer for non-logged users */}
        {!isLoggedIn && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-background border-t border-border">
            <p className="text-center text-[10px] text-muted-foreground">
              VERZE {APP_VERSION} — © {COPYRIGHT_YEAR} ZROBEE
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
    
    <AddToHomeScreenModal 
      open={showIosModal} 
      onOpenChange={setShowIosModal} 
    />
    </>
  );
}

