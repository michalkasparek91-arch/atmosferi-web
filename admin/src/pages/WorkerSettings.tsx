import { useEffect, useState, useRef } from "react";
import ContentLoader from "@/components/ContentLoader";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsNativeApp } from "@/hooks/useIsNativeApp";
import { DeleteAccountSection } from "@/components/DeleteAccountSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  LogOut, 
  Sun, 
  Moon, 
  Bell, 
  BellOff, 
  ThumbsUp, 
  Briefcase, 
  MessageSquare, 
  Mail, 
  Star, 
  ShieldCheck, 
  CreditCard, 
  History, 
  User, 
  Settings, 
  Info, 
  Heart, 
  Wallet,
  Loader2,
  ChevronRight,
  Shield,
  Smartphone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Building2,
  Globe
} from "lucide-react";
import EmbeddableBadge from "@/components/worker/EmbeddableBadge";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { geocodeAddress } from "@/lib/geocode-address";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { WorkerLocationMap } from "@/components/WorkerLocationMap";
import { Pencil, Check, X } from "lucide-react";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { Input } from "@/components/ui/input";
import { AddressAutocompleteInput, AddressSelectResult } from "@/components/AddressAutocompleteInput";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  isPushSupported, 
  isSubscribedToPush, 
  subscribeToPush, 
  unsubscribeFromPush,
  isIOS,
  isStandalone,
  getNotificationPermission,
  getPushDiagnostics,
  
  deepUnregisterServiceWorkers,
  checkAndRepairSubscription
} from "@/lib/push-notifications";
import { SoftPushOnboarding } from "@/components/push/SoftPushOnboarding";
import { AddToHomeScreenModal } from "@/components/AddToHomeScreenModal";
import { getBlockedNotificationToastDescription } from "@/components/NotificationBlockedGuide";

const WorkerSettings = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isNativeApp = useIsNativeApp();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [workerServices, setWorkerServices] = useState<any[]>([]);
  const [editingLocation, setEditingLocation] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  
  const [tempEmail, setTempEmail] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingNotifications, setMarketingNotifications] = useState(false);
  const [editingAuthEmail, setEditingAuthEmail] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [tempAuthEmail, setTempAuthEmail] = useState('');
  const [tempPhone, setTempPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authUser, setAuthUser] = useState<any>(null);
  const [showVerifyPhoneDialog, setShowVerifyPhoneDialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [sendingVerification, setSendingVerification] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    return (location.state as any)?.activeTab || "appearance";
  });

  // Location address parts (UI only)
  const [locStreetName, setLocStreetName] = useState('');
  const [locStreetNumber, setLocStreetNumber] = useState('');
  const [locPostalCode, setLocPostalCode] = useState('');
  const [locCity, setLocCity] = useState('');

  // Push notifications state
  const [pushNotifications, setPushNotifications] = useState(false);
  const [pushNewJobs, setPushNewJobs] = useState(true);
  const [pushNewMessages, setPushNewMessages] = useState(true);
  const [pushOfferAccepted, setPushOfferAccepted] = useState(true);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [showAddToHomeScreen, setShowAddToHomeScreen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const hasAutoHealed = useRef(false);

  // Email notification states (individual toggles)
  const [emailNewJobs, setEmailNewJobs] = useState(true);
  const [emailNewMessages, setEmailNewMessages] = useState(true);
  const [emailOfferAccepted, setEmailOfferAccepted] = useState(true);

  // Business state
  const [business, setBusiness] = useState<any>(null);
  const [editingBusiness, setEditingBusiness] = useState(false);
  const [createBusinessMode, setCreateBusinessMode] = useState(false);
  const [tempBusinessName, setTempBusinessName] = useState('');
  const [tempIco, setTempIco] = useState('');
  const [tempDic, setTempDic] = useState('');
  const [tempCompanyType, setTempCompanyType] = useState('self_employed');
  const [businessLoading, setBusinessLoading] = useState(false);

  // Push diagnostics state
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [testPushLoading, setTestPushLoading] = useState(false);
  const [testRawPushLoading, setTestRawPushLoading] = useState(false);
  const [resubscribeLoading, setResubscribeLoading] = useState(false);

  async function runDiagnostics() {
    setDiagLoading(true);
    try {
      const diag = await getPushDiagnostics();
      setDiagnostics(diag);
    } catch (err) {
      console.error('[Diagnostics] Error:', err);
    } finally {
      setDiagLoading(false);
    }
  }

  const checkPushSupport = async (uid?: string) => {
    const id = uid || userId;
    if (!id) return;

    const supported = isPushSupported();
    setPushSupported(supported);
    
    if (supported) {
      const permission = getNotificationPermission();
      
      // If browser has granted permission, show toggle as ON and ensure subscription exists
      if (permission === 'granted') {
        setPushNotifications(true);
        
        // Silently re-register subscription if missing (e.g. after cache clear)
        const subscribed = await isSubscribedToPush();
        if (!subscribed) {
          subscribeToPush(id, false, true).catch(err => {
            console.warn('[WorkerSettings] Background re-registration failed:', err?.message);
          });
        }
      } else {
        setPushNotifications(false);
      }
      
      // Load sub-toggle states from DB
      const { data: profile } = await supabase
        .from('profiles')
        .select('push_new_jobs, push_new_messages, push_offer_accepted')
        .eq('id', id)
        .single();
        
      if (profile) {
        setPushNewJobs(profile.push_new_jobs ?? true);
        setPushNewMessages(profile.push_new_messages ?? true);
        setPushOfferAccepted((profile as any).push_offer_accepted ?? true);
      }
    }
  }

  useEffect(() => {
    // Check initial theme
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
    checkUser();

    // Run diagnostics immediately
    runDiagnostics();
    
    // Some browsers need a moment to set the controller after registration
    const timer = setTimeout(() => {
      console.log('[Diagnostics] Performing delayed check for SW controller...');
      runDiagnostics();
    }, 1000);

    // Occasional background check
    const interval = setInterval(() => {
      if (userId && !pushLoading) {
        checkPushSupport(userId);
      }
    }, 10000);

    // Listen for Service Worker controller changes (activation/claiming)
    if ('serviceWorker' in navigator) {
      const handleControllerChange = () => {
        console.log('[Push] Service Worker controller changed, refreshing diagnostics...');
        runDiagnostics();
        if (userId && !pushLoading) checkPushSupport(userId);
      };
      
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      
      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        clearInterval(interval);
        clearTimeout(timer);
      };
    }

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [userId]);

  const toggleDarkMode = () => {
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

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/prihlaseni');
      return;
    }
    setUserId(session.user.id);
    setLoading(false);
    loadProfile();
    loadAuthUser();
    checkPushSupport(session.user.id);
  }



  const handleTogglePushNotifications = async (enabled: boolean) => {
    if (pushLoading || !userId) return;

    // iOS standalone check
    if (isIOS() && !isStandalone()) {
      setShowAddToHomeScreen(true);
      setPushNotifications(false);
      return;
    }

    const permission = getNotificationPermission();
    if (enabled && permission === 'denied') {
      toast.error('Oprávnění zamítnuto', {
        description: getBlockedNotificationToastDescription(),
      });
      setPushNotifications(false);
      return;
    }

    setPushLoading(true);
    try {
      if (enabled) {
        console.log('[Push] Master toggle ON - requesting permission/subscribing');
        const success = await subscribeToPush(userId);
        if (success) {
          setPushNotifications(true);
          await supabase.from('profiles').update({ push_notifications: true }).eq('id', userId);
          toast.success("Push notifikace zapnuty");
        } else if (getNotificationPermission() === 'default') {
          // User probably closed the prompt
          setPushNotifications(false);
        }
      } else {
        console.log('[Push] Master toggle OFF - unsubscribing');
        const success = await unsubscribeFromPush(userId);
        if (success) {
          setPushNotifications(false);
          await supabase.from('profiles').update({ push_notifications: false }).eq('id', userId);
          toast.success("Push notifikace vypnuty");
        }
      }
    } catch (error: any) {
      console.error('[Push] Toggle error:', error);
      if (error.code === 'IOS_NOT_STANDALONE') {
        toast.error("iOS: Přidejte si aplikaci na plochu");
      } else if (error.message?.includes('denied') || getNotificationPermission() === 'denied') {
        toast.error('Oprávnění zamítnuto', {
          description: getBlockedNotificationToastDescription(),
        });
        setPushNotifications(false);
      } else {
        toast.error("Chyba při nastavení notifikací");
        setPushNotifications(false);
      }
      
      const isActuallySubscribed = await isSubscribedToPush();
      setPushNotifications(isActuallySubscribed);
    } finally {
      setPushLoading(false);
      // Force diagnostics refresh after a delay to ensure UI is in sync
      setTimeout(runDiagnostics, 800);
    }
  };

  const handleTogglePushNewJobs = async (checked: boolean) => {
    if (!userId) return;
    
    if (!pushNotifications && checked) {
      const success = await subscribeToPush(userId);
      if (success) {
        setPushNotifications(true);
        await supabase.from('profiles').update({ push_notifications: true }).eq('id', userId);
      }
    }
    
    setPushNewJobs(checked);
    await supabase.from('profiles').update({ push_new_jobs: checked }).eq('id', userId);
  };

  const handleTogglePushNewMessages = async (checked: boolean) => {
    if (!userId) return;
    
    if (!pushNotifications && checked) {
      const success = await subscribeToPush(userId);
      if (success) {
        setPushNotifications(true);
        await supabase.from('profiles').update({ push_notifications: true }).eq('id', userId);
      }
    }
    
    setPushNewMessages(checked);
    await supabase.from('profiles').update({ push_new_messages: checked }).eq('id', userId);
  };

  const handleTogglePushOfferAccepted = async (checked: boolean) => {
    if (!userId) return;

    if (!pushNotifications && checked) {
      const success = await subscribeToPush(userId);
      if (success) {
        setPushNotifications(true);
        await supabase.from('profiles').update({ push_notifications: true }).eq('id', userId);
      }
    }

    setPushOfferAccepted(checked);
    await supabase.from('profiles').update({ push_offer_accepted: checked } as any).eq('id', userId);
  };

  const renderPushNotificationStatus = () => {
    if (!pushSupported) {
      return (
        <p className="text-sm text-muted-foreground">
          Push notifikace nejsou v tomto prohlížeči podporovány.
        </p>
      );
    }
    
    const permission = getNotificationPermission();
    if (permission === 'denied') {
      return (
        <p className="text-sm text-destructive">
          Notifikace jsou zablokované. Povolte je v nastavení prohlížeče.
        </p>
      );
    }
    
    if (isIOS() && !isStandalone()) {
      return (
        <p className="text-sm text-muted-foreground">
          Pro push notifikace na iOS přidejte aplikaci na plochu.
        </p>
      );
    }
    
    return null;
  };



  const sendTestPush = async (raw = false) => {
    if (!userId) return;
    if (raw) setTestRawPushLoading(true);
    else setTestPushLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('test-push-notification', {
        body: { userId, raw },
      });
      if (error) throw error;

      if (data?.success) {
        const deviceList = data.devices?.length > 0 ? data.devices.join(', ') : `${data.sent} zařízení`;
        toast.success(`Odesláno na: ${deviceList}`);

        // Probe receipt logging from the client (to verify the edge function + DB insert works)
        const diag = diagnostics ?? (await getPushDiagnostics());
        const endpointTail = diag?.endpoint || null;

        const { data: receiptData, error: receiptError } = await supabase.functions.invoke('log-push-receipt', {
          body: {
            subscriptionId: null,
            endpointTail,
            type: 'client-probe',
            tag: `client-probe-${Date.now()}`,
            note: 'client-after-test-push',
            userAgent: navigator.userAgent,
          },
        });

        if (receiptError) {
          // Only show error if it's not a 400 (which we now return 200/skipped for anyway)
          console.error('[Push Receipt Probe] Error:', receiptError);
        } else if (receiptData?.id) {
          toast.success(`Receipt log OK (id: ${receiptData.id})`);
        }
      } else {
        toast.error('Push se nepodařilo odeslat');
      }
    } catch (err: any) {
      toast.error('Chyba při odesílání testu: ' + err.message);
    } finally {
      setTestPushLoading(false);
      setTestRawPushLoading(false);
    }
  };

  const forceResubscribe = async () => {
    if (!userId) return;
    setResubscribeLoading(true);
    try {
      // Step 1: Deep unregister everything
      await deepUnregisterServiceWorkers();
      
      // Step 2: Fresh subscription
      await subscribeToPush(userId, true);
      
      toast.success('Úspěšně přeregistrováno!');
      await runDiagnostics();
    } catch (err: any) {
      toast.error('Chyba: ' + err.message);
    } finally {
      setResubscribeLoading(false);
    }
  };

  const pingServiceWorker = async () => {
    try {
      if (!('serviceWorker' in navigator)) throw new Error('Service Worker není podporován');
      const reg = await navigator.serviceWorker.ready;
      if (!reg.active) throw new Error('Service Worker není aktivní');
      
      const channel = new MessageChannel();
      const versionPromise = new Promise<string>((resolve) => {
        const timeout = setTimeout(() => resolve('timeout'), 4000);
        channel.port1.onmessage = (event) => {
          clearTimeout(timeout);
          if (event.data?.type === 'PONG_SW') resolve(event.data.version);
        };
      });

      reg.active.postMessage({ type: 'PING_SW' }, [channel.port2]);
      const version = await versionPromise;
      
      if (version === 'timeout') {
         toast.error('SW Timeout - neodpovídá na ping');
      } else {
         toast.success(`SW Potvrzen, verze ${version}`);
         setDiagnostics((prev: any) => (prev ? { ...prev, version } : null));
      }
    } catch (e: any) {
      toast.error('Ping selhal: ' + (e?.message || String(e)));
    }
  };

  async function loadAuthUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setAuthUser(user);
      setTempAuthEmail(user.email || '');
      setTempPhone(user.phone || '');
    }
  }

  async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
      setTempEmail(profileData.email || '');
      setEmailNotifications(profileData.email_notifications ?? true);
      setMarketingNotifications(profileData.marketing_notifications ?? false);

      // Load business data if company_id exists
      if (profileData.company_id) {
        const { data: businessData } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', profileData.company_id)
          .single();
        if (businessData) {
          setBusiness(businessData);
        }
      } else {
        setBusiness(null);
      }
    }

    const { data: servicesData } = await supabase
      .from('worker_services')
      .select('*, service_subcategories(*, service_categories(*))')
      .eq('worker_id', session.user.id);
    
    if (servicesData && servicesData.length > 0) {
      setWorkerServices(servicesData);
    }
  }

  const handleSaveLocation = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile) return;

    if (!locStreetNumber.trim()) {
      toast.error("Číslo popisné je povinné");
      return;
    }

    // Geocode from manual fields
    const coords = await geocodeAddress(locStreetName, locStreetNumber, locCity, locPostalCode);

    const composedAddress = locStreetName && locStreetNumber && locCity
      ? `${locStreetName} ${locStreetNumber}, ${locPostalCode} ${locCity}`.trim()
      : profile.full_address;

    const { error } = await supabase
      .from('profiles')
      .update({
        city: locCity || profile.city,
        full_address: composedAddress,
        latitude: coords?.lat ?? profile.latitude,
        longitude: coords?.lng ?? profile.longitude,
        street_name: locStreetName || null,
        street_number: locStreetNumber || null,
        postal_code: locPostalCode || null,
      })
      .eq('id', session.user.id);

    if (!error) {
      setEditingLocation(false);
      toast.success("Lokace byla uložena");
      loadProfile();
    } else {
      toast.error("Nepodařilo se uložit lokaci");
    }
  };

  const handleSaveEmail = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('profiles')
      .update({ email: tempEmail })
      .eq('id', session.user.id);

    if (!error) {
      setEditingEmail(false);
      loadProfile();
    }
  };

  const handleSaveNotificationPreferences = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase
      .from('profiles')
      .update({
        email_notifications: emailNotifications,
        marketing_notifications: marketingNotifications,
      })
      .eq('id', session.user.id);
  };

  useEffect(() => {
    if (profile) {
      handleSaveNotificationPreferences();
    }
  }, [emailNotifications, marketingNotifications]);

  const handleSaveEmailPreferences = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase
      .from('profiles')
      .update({
        email_new_jobs: emailNewJobs,
        email_new_messages: emailNewMessages,
        email_offer_accepted: emailOfferAccepted,
      } as any)
      .eq('id', session.user.id);
  };

  useEffect(() => {
    if (profile) {
      handleSaveEmailPreferences();
    }
  }, [emailNewJobs, emailNewMessages, emailOfferAccepted]);

  const ensureEmailEnabled = () => {
    if (!emailNotifications) {
      setEmailNotifications(true);
    }
    return true;
  };

  const handleToggleEmailNewJobs = (enabled: boolean) => {
    if (enabled) ensureEmailEnabled();
    setEmailNewJobs(enabled);
  };

  const handleToggleEmailNewMessages = (enabled: boolean) => {
    if (enabled) ensureEmailEnabled();
    setEmailNewMessages(enabled);
  };

  const handleToggleEmailOfferAccepted = (enabled: boolean) => {
    if (enabled) ensureEmailEnabled();
    setEmailOfferAccepted(enabled);
  };

  const handleUpdateAuthEmail = async () => {
    const { error } = await supabase.auth.updateUser({
      email: tempAuthEmail,
    });

    if (!error) {
      setEditingAuthEmail(false);
      loadAuthUser();
    }
  };

  const handleUpdatePhone = async () => {
    const { error } = await supabase.auth.updateUser({
      phone: tempPhone,
    });

    if (!error) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase
          .from('profiles')
          .update({ phone: tempPhone, phone_verified: false })
          .eq('id', session.user.id);
      }
      setEditingPhone(false);
      loadAuthUser();
      loadProfile();
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert('Nová hesla se neshodují');
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (!error) {
      setEditingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleSendVerification = async () => {
    setSendingVerification(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.phone) return;

    try {
      const { data, error } = await supabase.functions.invoke('send-phone-verification', {
        body: { phone: profile.phone, userId: session.user.id }
      });

      if (error) throw error;
      setShowVerifyPhoneDialog(true);
    } catch (error) {
      console.error('Error sending verification:', error);
    } finally {
      setSendingVerification(false);
    }
  };

  const handleVerifyCode = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.phone) return;

    try {
      const { data, error } = await supabase.functions.invoke('verify-phone-code', {
        body: { 
          phone: profile.phone, 
          code: verificationCode,
          userId: session.user.id 
        }
      });

      if (error) throw error;

      if (data.verified) {
        await supabase
          .from('profiles')
          .update({ phone_verified: true })
          .eq('id', session.user.id);
        
        setShowVerifyPhoneDialog(false);
        setVerificationCode('');
        loadProfile();
      }
    } catch (error) {
      console.error('Error verifying code:', error);
    }
  };

  const getIcon = (iconName: string) => {
    const Icon = getCategoryIcon(iconName);
    return <Icon className="h-4 w-4" />;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const groupedServices = workerServices.reduce((acc: any, service: any) => {
    const category = service.service_subcategories?.service_categories;
    if (!category) return acc;

    if (!acc[category.id]) {
      acc[category.id] = {
        category,
        subcategories: []
      };
    }

    acc[category.id].subcategories.push(service.service_subcategories);
    return acc;
  }, {});

  const sections = [
    { id: 'appearance', label: 'Vzhled', icon: Sun },
    { id: 'services', label: 'Služby a lokalita', icon: Briefcase },
    { id: 'business', label: 'Podnikání', icon: Building2 },
    { id: 'badge', label: 'Můj web', icon: Globe, badge: 'Nové' },
    { id: 'notifications', label: 'Oznámení', icon: Bell },
    { id: 'account', label: 'Správa účtu', icon: User },
    { id: 'promo', label: 'Placené volby', icon: CreditCard },
    { id: 'ratings', label: 'Hodnocení', icon: Star },
  ];

  if (loading) {
    return <ContentLoader />;
  }

  const renderSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case 'appearance':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border">
              <div className="flex items-center gap-3">
                {isDarkMode ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
                <div>
                  <p className="text-sm font-medium">Tmavý režim</p>
                  <p className="text-xs text-muted-foreground">Přepnout mezi světlým a tmavým režimem</p>
                </div>
              </div>
              <Switch checked={isDarkMode} onCheckedChange={toggleDarkMode} />
            </div>
          </div>
        );
      case 'services':
        return (
          <CardContent className="pt-0 space-y-6 px-0">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Vaše služby</h3>
                <Button onClick={() => navigate('/remeslnik/upravit-sluzby')} variant="outline" size="sm">
                  <Pencil className="h-4 w-4 mr-2" /> Upravit služby
                </Button>
              </div>
              {workerServices.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(workerServices.map((s: any) => s.service_subcategories?.service_categories?.id)))
                    .filter(Boolean)
                    .map((categoryId) => {
                      const sub = workerServices.filter((s: any) => s.service_subcategories?.service_categories?.id === categoryId);
                      const cat = sub[0]?.service_subcategories?.service_categories;
                      if (!cat) return null;
                      const Icon = getCategoryIcon(cat.icon);
                      return (
                        <Popover key={categoryId as string}>
                          <PopoverTrigger asChild>
                            <Button 
                              type="button"
                              variant="outline"
                              className="h-auto py-2 px-4 rounded-full border bg-muted/40 hover:bg-muted/60 transition-colors flex items-center gap-2"
                            >
                              <Icon className="h-4 w-4" />
                              <span className="text-sm font-medium">{cat.name}</span>
                              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary/15 text-primary text-xs font-semibold">
                                {sub.length}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-2 z-[100]" side="bottom" align="start">
                            <div className="space-y-0.5">
                              {sub.map((s: any) => (
                                <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                                  <Check className="h-3.5 w-3.5 text-primary" />
                                  {s.service_subcategories?.name}
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      );
                    })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Žádné služby nevybrány</p>
              )}
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold mb-4">Pracovní lokalita</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Adresa</label>
                  {editingLocation ? (
                    <div className="space-y-2">
                      <AddressAutocompleteInput
                        onSelect={(r) => {
                          setLocStreetName(r.streetName);
                          setLocStreetNumber(r.streetNumber);
                          setLocCity(r.city);
                          setLocPostalCode(r.postalCode);
                        }}
                        defaultValue={profile?.full_address || ''}
                        placeholder="Hledat adresu..."
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Ulice" value={locStreetName} onChange={(e) => setLocStreetName(e.target.value)} />
                        <Input placeholder="Č.P." value={locStreetNumber} onChange={(e) => setLocStreetNumber(e.target.value)} />
                        <Input placeholder="Město" value={locCity} onChange={(e) => setLocCity(e.target.value)} />
                        <Input placeholder="PSČ" value={locPostalCode} onChange={(e) => setLocPostalCode(e.target.value)} />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveLocation} size="sm"><Check className="h-4 w-4" /></Button>
                        <Button onClick={() => setEditingLocation(false)} variant="outline" size="sm"><X className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-muted-foreground text-sm">{profile?.full_address || profile?.city || 'Není nastavena'}</p>
                      <Button onClick={() => setEditingLocation(true)} variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
                {profile?.city && (
                  <div className="h-[250px] rounded-lg overflow-hidden border">
                    <WorkerLocationMap city={profile.city} />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        );
      case 'business':
        return (
          <CardContent className="pt-0 space-y-6 px-0">
            {profile?.company_id && business ? (
              // Business exists — view/edit mode
              <div className="space-y-6">
                {/* Wallet Balance */}
                <div className="flex items-center gap-3 p-4 rounded-xl border bg-primary/5">
                  <Wallet className="h-6 w-6 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Kreditový účet</p>
                    <p className="text-xl font-bold text-foreground">{business.points} <span className="text-sm font-normal text-muted-foreground">kreditů</span></p>
                  </div>
                </div>

                {editingBusiness ? (
                  <div className="space-y-4 border p-4 rounded-xl">
                    <div className="space-y-2">
                      <Label>Název firmy / jméno</Label>
                      <Input value={tempBusinessName} onChange={(e) => setTempBusinessName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>IČO</Label>
                      <Input value={tempIco} onChange={(e) => setTempIco(e.target.value)} placeholder="12345678" />
                    </div>
                    <div className="space-y-2">
                      <Label>DIČ</Label>
                      <Input value={tempDic} onChange={(e) => setTempDic(e.target.value)} placeholder="CZ12345678" />
                    </div>
                    <div className="space-y-2">
                      <Label>Typ podnikání</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={tempCompanyType === 'self_employed' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTempCompanyType('self_employed')}
                        >OSVČ</Button>
                        <Button
                          variant={tempCompanyType === 'company' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTempCompanyType('company')}
                        >Firma</Button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={businessLoading}
                        onClick={async () => {
                          if (!tempBusinessName.trim()) {
                            toast.error('Název je povinný');
                            return;
                          }
                          setBusinessLoading(true);
                          try {
                            const { error } = await supabase
                              .from('businesses')
                              .update({
                                name: tempBusinessName.trim(),
                                ico: tempIco.trim() || null,
                                dic: tempDic.trim() || null,
                                company_type: tempCompanyType,
                              })
                              .eq('id', business.id);
                            if (error) throw error;
                            toast.success('Údaje uloženy');
                            setEditingBusiness(false);
                            loadProfile();
                          } catch (err: any) {
                            toast.error('Chyba: ' + err.message);
                          } finally {
                            setBusinessLoading(false);
                          }
                        }}
                      >
                        {businessLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        <span className="ml-1">Uložit</span>
                      </Button>
                      <Button onClick={() => setEditingBusiness(false)} variant="outline" size="sm">
                        <X className="h-4 w-4 mr-1" /> Zrušit
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Údaje o podnikání</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTempBusinessName(business.name || '');
                          setTempIco(business.ico || '');
                          setTempDic(business.dic || '');
                          setTempCompanyType(business.company_type || 'self_employed');
                          setEditingBusiness(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Název</p>
                        <p className="font-medium">{business.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Typ</p>
                        <p className="font-medium">{business.company_type === 'self_employed' ? 'OSVČ' : 'Firma'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">IČO</p>
                        <p className="font-medium">{business.ico || '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">DIČ</p>
                        <p className="font-medium">{business.dic || '—'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // No business — create form
              <div className="space-y-6">
                <div className="text-center p-6 border border-dashed rounded-xl">
                  <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium mb-1">Nemáte registrované podnikání</p>
                  <p className="text-xs text-muted-foreground mb-4">Přidejte IČO a přepněte na firemní kreditový účet</p>
                  {!createBusinessMode && (
                    <Button onClick={() => {
                      setTempBusinessName(profile?.full_name || '');
                      setTempIco('');
                      setTempDic('');
                      setTempCompanyType('self_employed');
                      setCreateBusinessMode(true);
                    }}>
                      <Building2 className="h-4 w-4 mr-2" /> Přidat IČO
                    </Button>
                  )}
                </div>

                {createBusinessMode && (
                  <div className="border p-4 rounded-xl space-y-4">
                    <h3 className="text-sm font-semibold">Registrace podnikání</h3>
                    <div className="space-y-2">
                      <Label>Typ podnikání</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={tempCompanyType === 'self_employed' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setTempCompanyType('self_employed');
                            setTempBusinessName(profile?.full_name || '');
                          }}
                        >OSVČ</Button>
                        <Button
                          variant={tempCompanyType === 'company' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setTempCompanyType('company');
                            setTempBusinessName('');
                          }}
                        >Firma</Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Název {tempCompanyType === 'self_employed' ? '(jméno)' : 'firmy'}</Label>
                      <Input value={tempBusinessName} onChange={(e) => setTempBusinessName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>IČO</Label>
                      <Input value={tempIco} onChange={(e) => setTempIco(e.target.value)} placeholder="12345678" />
                    </div>
                    <div className="space-y-2">
                      <Label>DIČ (volitelné)</Label>
                      <Input value={tempDic} onChange={(e) => setTempDic(e.target.value)} placeholder="CZ12345678" />
                    </div>

                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                      <strong>Upozornění:</strong> Po vytvoření firemního účtu budou vaše stávající kredity převedeny do firemní peněženky.
                    </div>

                    <div className="flex gap-2">
                      <Button
                        disabled={businessLoading || !tempBusinessName.trim()}
                        onClick={async () => {
                          setBusinessLoading(true);
                          try {
                            const { data, error } = await supabase.rpc('create_business', {
                              p_name: tempBusinessName.trim(),
                              p_ico: tempIco.trim() || null,
                              p_dic: tempDic.trim() || null,
                              p_company_type: tempCompanyType,
                            });
                            if (error) throw error;
                            toast.success('Podnikání úspěšně registrováno!');
                            setCreateBusinessMode(false);
                            loadProfile();
                          } catch (err: any) {
                            toast.error('Chyba: ' + err.message);
                          } finally {
                            setBusinessLoading(false);
                          }
                        }}
                      >
                        {businessLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                        Vytvořit firemní účet
                      </Button>
                      <Button variant="outline" onClick={() => setCreateBusinessMode(false)}>Zrušit</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        );
      case 'badge':
        const slug = profile?.slug || 'vas-slug';
        const widgetCode = `<iframe src="https://zrobee.cz/widget/${slug}" width="300" height="135" style="border:none; border-radius: 12px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);"></iframe>`;
        return (
          <CardContent className="pt-0 space-y-6 px-0">
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 border rounded-xl">
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Propagujte se na vlastním webu
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Zkopírujte si tento kód a vložte jej na své webové stránky (např. do patičky nebo postranního panelu). Zákazníci uvidí vaše Zrobee hodnocení a budou vás moci poptat přímo přes náš systém. Tím budujete důvěru a navíc nám pomáháte v SEO, což vám přinese více zakázek!
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="mb-2 block">Váš HTML kód pro vložení:</Label>
                    <div className="relative">
                      <pre className="p-3 bg-muted rounded-lg text-[10px] overflow-x-auto border text-muted-foreground font-mono whitespace-pre-wrap word-break">
                        {widgetCode}
                      </pre>
                      <Button
                        size="sm"
                        className="absolute top-2 right-2 h-7 px-2"
                        variant="secondary"
                        onClick={() => {
                          navigator.clipboard.writeText(widgetCode);
                          toast.success("Kód byl zkopírován do schránky");
                        }}
                      >
                        Kopírovat
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-muted/20 p-4 rounded-xl border border-dashed">
                    <Label className="mb-3 block text-center">Živý náhled widgetu</Label>
                    {profile?.slug ? (
                      <iframe 
                        src={`/widget/${slug}`} 
                        width="300" 
                        height="135" 
                        style={{ border: "none", borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-4">Musíte mít nastavený veřejný profil.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        );
      case 'notifications':
        return (
          <CardContent className="pt-0 space-y-6 px-0">
            {/* Soft Push Onboarding / Diagnostic Banner */}
            {pushSupported && !pushNotifications && (
              <SoftPushOnboarding context="worker" onSubscribed={() => checkPushSupport(userId!)} />
            )}

            {/* Email Settings */}
            <div className="space-y-4 border p-4 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">E-mailové notifikace</p>
                  <p className="text-xs text-muted-foreground">{profile?.email || 'Není nastaveno'}</p>
                </div>
              </div>
              <div className="space-y-3 pl-8 border-l ml-2">
                {[
                  { label: 'Nové zakázky', sub: 'E-mail o nových zakázkách ve vaší oblasti', checked: emailNewJobs, onChange: handleToggleEmailNewJobs, icon: Briefcase },
                  { label: 'Nové zprávy', sub: 'E-mail o nových zprávách od zákazníků', checked: emailNewMessages, onChange: handleToggleEmailNewMessages, icon: MessageSquare },
                  { label: 'Přijatá nabídka', sub: 'E-mail když zákazník přijme vaši nabídku', checked: emailOfferAccepted, onChange: handleToggleEmailOfferAccepted, icon: ThumbsUp },
                ].map((item) => (
                  <div key={item.label} className="flex items-start justify-between py-1">
                    <div className="flex items-start gap-3">
                      <item.icon className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{item.sub}</p>
                      </div>
                    </div>
                    <Switch checked={emailNotifications && item.checked} onCheckedChange={item.onChange} disabled={!emailNotifications} />
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t mt-2">
                  <span className="text-sm font-medium">Povolit e-mailové notifikace</span>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>
              </div>
            </div>

            {/* Push Settings */}
            <div className="space-y-4 border p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {pushNotifications ? <Bell className="h-5 w-5 text-primary" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-semibold">Push notifikace</p>
                    <p className="text-xs text-muted-foreground">Okamžitá upozornění v prohlížeči</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {pushLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  <Switch 
                    checked={pushNotifications} 
                    onCheckedChange={(checked) => handleTogglePushNotifications(checked)} 
                    disabled={pushLoading || !pushSupported} 
                  />
                </div>
              </div>

              {renderPushNotificationStatus()}

              {pushSupported && (
                <div className={cn("space-y-3 pl-8 border-l ml-2 transition-opacity duration-200", !pushNotifications && "opacity-50")}>
                  {[
                    { label: 'Nové zakázky', sub: 'Notifikace o nových zakázkách ve vaší oblasti', checked: pushNewJobs, onChange: (v: boolean) => handleTogglePushNewJobs(v) },
                    { label: 'Nové zprávy', sub: 'Notifikace o nových zprávách od zákazníků', checked: pushNewMessages, onChange: (v: boolean) => handleTogglePushNewMessages(v) },
                    { label: 'Přijatá nabídka', sub: 'Když zákazník přijme vaši nabídku', checked: pushOfferAccepted, onChange: (v: boolean) => handleTogglePushOfferAccepted(v) },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start justify-between py-1">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{item.sub}</p>
                      </div>
                      <Switch 
                        checked={pushNotifications && item.checked} 
                        onCheckedChange={item.onChange} 
                        disabled={!pushNotifications || pushLoading} 
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        );
      case 'account':
        return (
          <CardContent className="pt-0 space-y-6 px-0">
            <div className="space-y-2">
              <Label>Přihlašovací email</Label>
              {editingAuthEmail ? (
                <div className="flex gap-2">
                  <Input size={1} className="flex-1" type="email" value={tempAuthEmail} onChange={(e) => setTempAuthEmail(e.target.value)} />
                  <Button onClick={handleUpdateAuthEmail} size="sm"><Check className="h-4 w-4" /></Button>
                  <Button onClick={() => setEditingAuthEmail(false)} variant="outline" size="sm"><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">{authUser?.email || 'Není nastaveno'}</p>
                  <Button onClick={() => setEditingAuthEmail(true)} variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Telefonní číslo</Label>
              {editingPhone ? (
                <div className="flex gap-2">
                  <Input size={1} className="flex-1" type="tel" value={tempPhone} onChange={(e) => setTempPhone(e.target.value)} placeholder="+420..." />
                  <Button onClick={handleUpdatePhone} size="sm"><Check className="h-4 w-4" /></Button>
                  <Button onClick={() => setEditingPhone(false)} variant="outline" size="sm"><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">{profile?.phone || 'Telefon nenastaven'}</p>
                    <Button onClick={() => setEditingPhone(true)} variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button>
                    {profile?.phone_verified && <Check className="h-4 w-4 text-green-500" />}
                  </div>
                  {profile?.phone && !profile?.phone_verified && (
                    <Button onClick={handleSendVerification} variant="outline" size="sm" disabled={sendingVerification}>Ověřit číslo SMSkou</Button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Heslo</Label>
              {editingPassword ? (
                <div className="space-y-2 max-w-sm">
                  <Input type="password" placeholder="Nové heslo" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  <Input type="password" placeholder="Potvrdit heslo" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  <div className="flex gap-2">
                    <Button onClick={handleChangePassword} size="sm">Uložit</Button>
                    <Button onClick={() => setEditingPassword(false)} variant="outline" size="sm">Zrušit</Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setEditingPassword(true)} variant="outline" size="sm">Změnit heslo</Button>
              )}
            </div>

            <div className="pt-6 border-t font-semibold mb-2">Smazání účtu</div>
            <DeleteAccountSection isNativeApp={isNativeApp} navigate={navigate} context="worker" />
          </CardContent>
        );
      case 'promo':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Star className="h-6 w-6 text-emerald-600 fill-emerald-600/20" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900">Topování profilu</h3>
                    <p className="text-xs text-zinc-500 mt-1">Zobrazujte se na prvních místech v hledání a získejte více zakázek.</p>
                  </div>
                </div>
                <Switch 
                  checked={profile?.is_promoted || false} 
                  onCheckedChange={async (val) => {
                    if (!profile?.is_pro) {
                      toast.error("Tato funkce je dostupná pouze pro PRO členy.");
                      return;
                    }
                    const { error } = await supabase
                      .from('profiles')
                      .update({ is_promoted: val })
                      .eq('id', userId);
                    if (!error) {
                      setProfile({ ...profile, is_promoted: val });
                      toast.success(val ? "Profil byl posunut nahoru" : "Topování vypnuto");
                    }
                  }}
                  disabled={!profile?.is_pro}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
              {!profile?.is_pro && (
                <div className="flex items-center gap-2 mt-4 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
                  <p className="text-[11px] text-amber-700 font-medium">Vyžaduje aktivní členství <span className="font-bold">PRO</span></p>
                  <Button variant="ghost" size="sm" className="ml-auto h-7 text-[11px] text-amber-800 hover:bg-amber-100 font-bold" disabled>AKTIVOVAT PRO</Button>
                </div>
              )}
            </div>

            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Ostatní volby</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {['Zóna výhod', 'Moje předplatné', 'Body a prémiové možnosti', 'Pojištění', 'Platby'].map((item) => (
                <Button key={item} variant="outline" disabled className="justify-start h-12 px-4 text-sm">
                  <CreditCard className="h-4 w-4 mr-3 text-muted-foreground" />
                  {item}
                </Button>
              ))}
            </div>
          </div>
        );
      case 'ratings':
        return (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Hodnocení</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {['Recenze', 'Certifikát Zrobee'].map((item) => (
                <Button key={item} variant="outline" disabled className="justify-start h-12 px-4 text-sm">
                  <Star className="h-4 w-4 mr-3 text-muted-foreground" />
                  {item}
                </Button>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen px-3 md:px-0 pt-4 md:pt-8 pb-6">
      <div className="w-full space-y-6">

          {!isMobile ? (
            /* Desktop Layout: Sidebar + Active Content */
            <div className="grid grid-cols-[280px_1fr] gap-8">
              <aside className="space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-2">Hlavní nastavení</div>
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveTab(section.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                      activeTab === section.id 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <section.icon className={cn("h-4 w-4", activeTab === section.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                      {section.label}
                    </div>
                    {section.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                        {section.badge}
                      </span>
                    )}
                  </button>
                ))}
                <div className="pt-8 space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-2">Relace</div>
                  <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all">
                    <LogOut className="h-4 w-4" />
                    Odhlásit se
                  </button>
                </div>
              </aside>

              <main>
                <Card className="rounded-2xl border shadow-sm p-6 bg-card min-h-[400px]">
                  <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    {(() => {
                      const s = sections.find(x => x.id === activeTab);
                      return s ? (
                        <>
                          <s.icon className="h-5 w-5 text-primary" />
                          {s.label}
                        </>
                      ) : null;
                    })()}
                  </h2>
                  {renderSectionContent(activeTab)}
                </Card>
              </main>
            </div>
          ) : (
            /* Mobile Layout: Premium Accordion */
            <div className="space-y-4">
              <Card className="rounded-2xl overflow-hidden border shadow-sm">
                <Accordion type="single" collapsible defaultValue={activeTab}>
                  {sections.map((section) => (
                    <AccordionItem key={section.id} value={section.id} className="border-b last:border-0 px-1">
                      <AccordionTrigger className="px-4 py-4 hover:no-underline font-medium hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <section.icon className="h-4 w-4 text-primary" />
                          {section.label}
                          {section.badge && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                              {section.badge}
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 bg-muted/10">
                        <div className="pt-2">
                          {renderSectionContent(section.id)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>

              {/* Marketing and Legals card at bottom for mobile */}
              <Card className="rounded-2xl shadow-sm border p-4 space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b pb-2">Právní a marketing</h3>
                <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-lg">
                  <Checkbox id="marketing-mobile" checked={marketingNotifications} onCheckedChange={(c) => setMarketingNotifications(c as boolean)} />
                  <div className="space-y-1">
                    <label htmlFor="marketing-mobile" className="text-xs font-medium cursor-pointer">Marketingové zprávy</label>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      Zaškrtnutím výše uvedeného pole souhlasím s tím, že mi Zrobee bude zasílat obchodní informace (např. newslettery, SMS zprávy) prostřednictvím elektronických prostředků komunikace a telekomunikačních zařízení.
                    </p>
                  </div>
                </div>
              </Card>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 p-4 mt-4 bg-card rounded-2xl border border-destructive/20 text-destructive font-medium shadow-sm active:scale-[0.98] transition-all"
              >
                <LogOut className="h-4 w-4" />
                Odhlásit se
              </button>
            </div>
          )}

        <Dialog open={showVerifyPhoneDialog} onOpenChange={setShowVerifyPhoneDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ověření telefonního čísla</DialogTitle>
              <DialogDescription>
                Zadejte 6místný kód, který jsme odeslali na vaše telefonní číslo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input type="text" placeholder="Kód" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} maxLength={6} />
              <Button onClick={handleVerifyCode} className="w-full">Ověřit</Button>
            </div>
          </DialogContent>
        </Dialog>

        <AddToHomeScreenModal open={showAddToHomeScreen} onOpenChange={setShowAddToHomeScreen} />
      </div>
    </div>
  );
};

export default WorkerSettings;
