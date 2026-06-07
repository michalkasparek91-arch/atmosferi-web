import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { lazy, Suspense, useEffect, useState, useRef } from "react";
import { ArrowLeft, ChevronDown, Moon, Sun, ArrowLeftRight, User, LayoutDashboard, LogOut, Settings } from "lucide-react";
import zrobeeLogo from "@/assets/zrobee-logo.svg";
import { hapticTap } from "@/utils/haptics";
import { getPageTitle } from "@/lib/page-titles";
import { safeGoBack } from "@/utils/navigation";
import { HamburgerMenu } from "./HamburgerMenu";
import UserMenu from "./UserMenu";
import { useProfile } from "@/hooks/use-profile";
const AuthDialog = lazy(() => import("./AuthDialog"));
const ServicesDropdown = lazy(() => import("./ServicesDropdown"));
import { NotificationInbox } from "./NotificationInbox";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Lazy-load supabase to keep it out of the critical rendering path
const getSupabase = () => import("@/integrations/supabase/client").then(m => m.supabase);

const Header = () => {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authInitialStep, setAuthInitialStep] = useState<"email" | "register-type">("email");
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const { profile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const supabaseRef = useRef<Awaited<ReturnType<typeof getSupabase>> | null>(null);

  const toggleTheme = () => {
    hapticTap();
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };
  
  const isJobPosting = location.pathname === '/nova-poptavka';
  const isWorkerOnboarding = location.pathname === '/registrace-remeslnika';
  const isLandingPage = location.pathname === '/';
  
  const isInfoPage = ['/o-nas', '/jak-to-funguje', '/kariera', '/ochrana-udaju', '/podminky', '/podpora', '/vsechny-sluzby'].includes(location.pathname);
  
  const isWorkerContext = location.pathname.startsWith('/remeslnik') || 
    (isInfoPage && userType === 'worker') || 
    (isInfoPage && userType === 'both' && sessionStorage.getItem('lastContext') === 'worker');

  useEffect(() => {
    if (location.pathname.startsWith('/remeslnik')) {
      sessionStorage.setItem('lastContext', 'worker');
    } else if (location.pathname.startsWith('/zakaznik')) {
      sessionStorage.setItem('lastContext', 'customer');
    }
  }, [location.pathname]);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    getSupabase().then((supabase) => {
      supabaseRef.current = supabase;

      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          loadUserType(supabase, session.user.id);
        }
      });

      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          loadUserType(supabase, session.user.id);
        } else {
          setUserType(null);
        }
      });
      subscription = sub;
    });

    return () => subscription?.unsubscribe();
  }, []);

  const loadUserType = async (supabase: Awaited<ReturnType<typeof getSupabase>>, userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', userId)
      .single();
    
    if (data) {
      setUserType(data.user_type);
    }
  };

  const handleLogout = async () => {
    const supabase = supabaseRef.current || await getSupabase();
    await supabase.auth.signOut();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (isWorkerContext || userType === 'worker') return '/remeslnik/hledej';
    return '/zakaznik/nova-zakazka';
  };

  const getBackFallback = () => {
    if (location.pathname.startsWith('/sluzby') || location.pathname.startsWith('/mesta')) return '/vsechny-sluzby';
    if (location.pathname.startsWith('/remeslnik/')) return '/';
    return '/';
  };

  const showMobileBack = !isLandingPage;

  const openAuthDialog = (step: "email" | "register-type" = "email") => {
    hapticTap();
    setAuthInitialStep(step);
    setAuthDialogOpen(true);
  };

  const handleAccountTypeSwitch = async () => {
    if (!user) {
      navigate('/registrace-remeslnika');
      return;
    }

    const supabase = supabaseRef.current || await getSupabase();
    const newType = userType === 'worker' ? 'customer' : 'worker';
    
    if (newType === 'worker') {
      const [profileResult, servicesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('phone, company_type')
          .eq('id', user.id)
          .single(),
        supabase
          .from('worker_services')
          .select('id')
          .eq('worker_id', user.id)
      ]);
      
      if (!profileResult.data?.phone || !profileResult.data?.company_type || 
          !servicesResult.data || servicesResult.data.length === 0) {
        navigate('/registrace-remeslnika');
        return;
      }
    }

    setUserType(newType);
    
    supabase
      .from('profiles')
      .update({ user_type: newType })
      .eq('id', user.id);

    if (newType === 'worker') {
      navigate('/remeslnik/hledej');
    } else {
      navigate('/zakaznik/nova-zakazka');
    }
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <header className="bg-background sticky top-0 z-50">
      <div className="md:hidden relative h-14 px-3 flex items-center justify-between border-b border-border/40">
        {showMobileBack ? (
          <button
            onClick={() => {
              hapticTap();
              safeGoBack(navigate, getBackFallback());
            }}
            className="h-10 w-10 rounded-full flex items-center justify-center text-foreground hover:bg-muted transition-colors"
            aria-label="Zpět"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2} />
          </button>
        ) : (
          <div className="h-10 w-10" aria-hidden="true" />
        )}

        <Link
          to={user ? (isWorkerContext || userType === 'worker' ? '/remeslnik/hledej' : '/zakaznik/nova-zakazka') : '/'}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center hover:opacity-80 transition-opacity"
          aria-label="Zrobee domů"
        >
          <img src={zrobeeLogo} alt="zrobee" className="h-6 logo-adaptive" />
        </Link>

        <HamburgerMenu
          onLoginClick={() => openAuthDialog("email")}
          onRegisterClick={() => openAuthDialog("email")}
          onThemeToggle={toggleTheme}
          isDark={isDark}
        />
      </div>

      <div className="hidden md:flex items-center justify-between px-8 lg:px-[150px] py-4">
        <div className="flex items-center gap-6 min-w-0">
          <Link to={user ? (isWorkerContext || userType === 'worker' ? '/remeslnik/hledej' : '/zakaznik/nova-zakazka') : '/'} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={zrobeeLogo} alt="zrobee" className="h-7 logo-adaptive" />
            {isWorkerContext && (
              <span className="text-[10px] font-bold text-primary-foreground bg-primary px-2 py-0.5 rounded-full -mt-1">PRO</span>
            )}
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {!user && !isLandingPage && (
            <button
              onClick={toggleTheme}
              className="h-10 w-10 rounded-full bg-card flex items-center justify-center hover:opacity-80 transition-opacity border border-border"
              aria-label="Toggle dark mode"
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-foreground" />
              ) : (
                <Moon className="h-4 w-4 text-foreground" />
              )}
            </button>
          )}
          <Button
            variant="outline"
            onClick={() => { hapticTap(); setServicesDropdownOpen(!servicesDropdownOpen); }}
            className="hidden md:flex items-center gap-1"
          >
            Služby
            <ChevronDown className="h-4 w-4" />
          </Button>
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center mr-1">
                <NotificationInbox />
              </div>
              <UserMenu 
                user={user}
                userType={userType}
                profile={profile}
                isWorkerContext={isWorkerContext}
                onLogout={handleLogout}
                onAccountTypeSwitch={handleAccountTypeSwitch}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                onClick={() => openAuthDialog("email")}
              >
                Přihlášení
              </Button>
              <Button 
                onClick={() => openAuthDialog("email")}
                className="bg-primary text-primary-foreground hover:bg-primary-hover"
              >
                Registrace
              </Button>
            </div>
          )}
        </div>
      </div>

      {authDialogOpen && (
        <Suspense fallback={null}>
          <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} initialStep={authInitialStep} />
        </Suspense>
      )}
      {servicesDropdownOpen && (
        <Suspense fallback={null}>
          <ServicesDropdown 
            open={servicesDropdownOpen} 
            onOpenChange={setServicesDropdownOpen}
          />
        </Suspense>
      )}
    </header>
  );
};

export default Header;
