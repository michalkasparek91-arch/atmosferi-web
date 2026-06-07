import { useEffect, useState, useRef } from "react";
import NotificationBlockedGuide, { getBlockedNotificationToastDescription } from "@/components/NotificationBlockedGuide";
import ContentLoader from "@/components/ContentLoader";
import { useIsNativeApp } from "@/hooks/useIsNativeApp";
import { DeleteAccountSection } from "@/components/DeleteAccountSection";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { LogOut, Pencil, Check, X, Sun, Moon, Bell, MessageSquare, UserPlus, CheckCircle, Loader2, AlertTriangle, CheckCircle2, Mail } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { AddToHomeScreenModal } from "@/components/AddToHomeScreenModal";
import {
  getNotificationPermission,
  isIOS,
  isPushSupported,
  isStandalone,
  isSubscribedToPush,
  subscribeToPush,
  unsubscribeFromPush,
  nukePushSystem,
} from "@/lib/push-notifications";
import { SoftPushOnboarding } from "@/components/push/SoftPushOnboarding";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const CustomerSettings = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isNativeApp = useIsNativeApp();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [tempEmail, setTempEmail] = useState('');
  const [tempPhone, setTempPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingNotifications, setMarketingNotifications] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [pushNewMessages, setPushNewMessages] = useState(true);
  const [pushNewOffers, setPushNewOffers] = useState(true);
  const [pushJobCompleted, setPushJobCompleted] = useState(true);
  const [showAddToHomeScreen, setShowAddToHomeScreen] = useState(false);

  // Email notification states (individual toggles)
  const [emailNewMessages, setEmailNewMessages] = useState(true);
  const [emailNewOffers, setEmailNewOffers] = useState(true);
  const [emailJobCompleted, setEmailJobCompleted] = useState(true);

  const [authUser, setAuthUser] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const hasAutoHealed = useRef(false);
  useEffect(() => {
    // Check initial theme
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
    checkUser();

    // Occasional background check
    const interval = setInterval(() => {
      if (userId && !pushLoading) {
        checkPushSupport(userId);
      }
    }, 10000);

    // Listen for Service Worker controller changes (activation/claiming)
    if ('serviceWorker' in navigator) {
      const handleControllerChange = () => {
        console.log('[Customer Push] Service Worker controller changed, refreshing status...');
        if (userId && !pushLoading) checkPushSupport(userId);
      };
      
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        clearInterval(interval);
      };
    }

    return () => {
      clearInterval(interval);
    };
  }, [userId]);

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

  async function loadAuthUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setAuthUser(user);
      setTempEmail(user.email || '');
      setTempPhone(user.phone || '');
    }
  }

  async function checkPushSupport(uid?: string) {
    const id = uid || userId;
    if (!id) return;

    const supported = isPushSupported();
    setPushSupported(supported);

    if (supported) {
      const permission = getNotificationPermission();
      
      // If browser has granted permission, show toggle as ON and ensure subscription exists
      if (permission === 'granted') {
        setPushNotifications(true);
        
        // Silently re-register subscription if it's missing (e.g. after cache clear)
        const subscribed = await isSubscribedToPush();
        if (!subscribed) {
          subscribeToPush(id, false, true).catch(err => {
            console.warn('[CustomerSettings] Background re-registration failed:', err?.message);
          });
        }
      } else {
        setPushNotifications(false);
      }
      
      // Load sub-toggle states from DB
      const { data: profile } = await supabase
        .from('profiles')
        .select('push_new_messages, push_new_offers, push_job_completed')
        .eq('id', id)
        .single();
        
      if (profile) {
        setPushNewMessages((profile as any).push_new_messages ?? true);
        setPushNewOffers((profile as any).push_new_offers ?? true);
        setPushJobCompleted((profile as any).push_job_completed ?? true);
      }
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
      setEmailNotifications(profileData.email_notifications ?? true);
      setMarketingNotifications(profileData.marketing_notifications ?? false);
      if (profileData.phone) {
        setTempPhone(profileData.phone);
      }

      // Reflect DB flag as source of truth
      setPushNotifications(!!(profileData as any).push_notifications);
      
      const supported = isPushSupported();
      const subscribed = supported ? await isSubscribedToPush() : false;

      setPushNewMessages((profileData as any).push_new_messages ?? true);
      setPushNewOffers((profileData as any).push_new_offers ?? true);
      setPushJobCompleted((profileData as any).push_job_completed ?? true);

      // Load email notification preferences
      setEmailNewMessages((profileData as any).email_new_messages ?? true);
      setEmailNewOffers((profileData as any).email_new_offers ?? true);
      setEmailJobCompleted((profileData as any).email_job_completed ?? true);
    }
  }


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

  const handleSavePushPreferences = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase
      .from('profiles')
      .update({
        push_new_messages: pushNewMessages,
        push_new_offers: pushNewOffers,
        push_job_completed: pushJobCompleted,
      } as any)
      .eq('id', session.user.id);
  };

  useEffect(() => {
    if (profile) {
      handleSaveNotificationPreferences();
    }
  }, [emailNotifications, marketingNotifications]);

  useEffect(() => {
    if (profile && pushNotifications) {
      handleSavePushPreferences();
    }
  }, [pushNewMessages, pushNewOffers, pushJobCompleted]);

  const handleSaveEmailPreferences = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase
      .from('profiles')
      .update({
        email_new_messages: emailNewMessages,
        email_new_offers: emailNewOffers,
        email_job_completed: emailJobCompleted,
      } as any)
      .eq('id', session.user.id);
  };

  useEffect(() => {
    if (profile) {
      handleSaveEmailPreferences();
    }
  }, [emailNewMessages, emailNewOffers, emailJobCompleted]);

  const ensureEmailEnabled = () => {
    if (!emailNotifications) {
      setEmailNotifications(true);
    }
    return true;
  };

  const handleToggleEmailNewMessages = (enabled: boolean) => {
    if (enabled) ensureEmailEnabled();
    setEmailNewMessages(enabled);
  };

  const handleToggleEmailNewOffers = (enabled: boolean) => {
    if (enabled) ensureEmailEnabled();
    setEmailNewOffers(enabled);
  };

  const handleToggleEmailJobCompleted = (enabled: boolean) => {
    if (enabled) ensureEmailEnabled();
    setEmailJobCompleted(enabled);
  };

  const handleTogglePushNotifications = async (enabled: boolean): Promise<boolean> => {
    if (!userId) return false;

    const permission = getNotificationPermission();
    if (enabled && permission === 'denied') {
      toast({
        title: "Oprávnění zamítnuto",
        description: getBlockedNotificationToastDescription(),
        variant: "destructive",
      });
      setPushNotifications(false);
      return false;
    }

    setPushLoading(true);
    try {
      if (enabled) {
        // subscribeToPush now requests permission immediately at the top
        const success = await subscribeToPush(userId);
        if (!success && getNotificationPermission() === 'default') {
          setPushNotifications(false);
          setPushLoading(false);
          return false;
        }
      } else {
        await unsubscribeFromPush(userId);
      }

      const subscribed = pushSupported ? await isSubscribedToPush() : false;
      setPushNotifications(subscribed);

      if (enabled && subscribed) {
        toast({
          title: "Push notifikace povoleny",
          description: "Budete dostávat upozornění podle nastavení níže.",
        });
      } else if (!enabled && !subscribed) {
        toast({
          title: "Push notifikace vypnuty",
          description: "V tomto prohlížeči nebudete dostávat push upozornění.",
        });
      }

      return subscribed === enabled;
    } catch (error: any) {
      console.error('Push notification error:', error);

      if (error.code === 'IOS_NOT_STANDALONE') {
        setShowAddToHomeScreen(true);
        setPushNotifications(false);
      } else if (error.message?.includes('denied') || getNotificationPermission() === 'denied') {
        toast({
          title: "Oprávnění zamítnuto",
          description: getBlockedNotificationToastDescription(),
          variant: "destructive",
        });
        setPushNotifications(false);
      } else if (error.message?.includes('permission') || error.message?.includes('denied')) {
        // Silent fail or user closed prompt
        setPushNotifications(false);
      } else {
        toast({
          title: "Chyba",
          description: error.message || "Nepodařilo se nastavit push notifikace.",
          variant: "destructive",
        });
        setPushNotifications(false);
      }

      const isActuallySubscribed = await isSubscribedToPush();
      setPushNotifications(isActuallySubscribed);
      return false;
    } finally {
      setPushLoading(false);
    }
  };


  const ensurePushEnabled = async () => {
    if (pushNotifications) return true;
    return await handleTogglePushNotifications(true);
  };

  const handleTogglePushNewMessages = async (enabled: boolean) => {
    if (enabled) {
      const ok = await ensurePushEnabled();
      if (!ok) return;
    }
    setPushNewMessages(enabled);
  };

  const handleTogglePushNewOffers = async (enabled: boolean) => {
    if (enabled) {
      const ok = await ensurePushEnabled();
      if (!ok) return;
    }
    setPushNewOffers(enabled);
  };

  const handleTogglePushJobCompleted = async (enabled: boolean) => {
    if (enabled) {
      const ok = await ensurePushEnabled();
      if (!ok) return;
    }
    setPushJobCompleted(enabled);
  };

  const handleUpdateEmail = async () => {
    const { error } = await supabase.auth.updateUser({
      email: tempEmail,
    });

    if (!error) {
      setEditingEmail(false);
      loadAuthUser();
    }
  };

  const handleUpdatePhone = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase
      .from('profiles')
      .update({ phone: tempPhone })
      .eq('id', session.user.id);

    setEditingPhone(false);
    loadProfile();
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


  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };


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

  if (loading) {
    return <ContentLoader />;
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background px-3 md:px-0 pt-1 pb-20">
        <div className="mt-1 mb-1">
          <div className="flex items-center min-h-[36px] -mx-3 px-3 md:mx-0 md:px-0 pb-1">
            <h1 className="text-lg font-semibold text-foreground">Nastavení</h1>
          </div>
        </div>
        <div className="space-y-6">
          <Card className="border-0 shadow-none">
            <Accordion type="single" collapsible>
              {/* Appearance */}
              <AccordionItem value="appearance" className="border-b">
                <AccordionTrigger className="px-4 py-4 hover:no-underline">
                  <span className="text-sm font-medium">Vzhled</span>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isDarkMode ? (
                          <Moon className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Sun className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-sm font-medium">Tmavý režim</p>
                          <p className="text-xs text-muted-foreground">
                            Přepnout mezi světlým a tmavým režimem
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={isDarkMode}
                        onCheckedChange={toggleDarkMode}
                      />
                    </div>
                  </CardContent>
                </AccordionContent>
              </AccordionItem>

              {/* Notifications */}
              <AccordionItem value="notifications" className="border-b">
                <AccordionTrigger className="px-4 py-4 hover:no-underline">
                  <span className="text-sm font-medium">Oznámení</span>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0 space-y-6">
                    {/* Push Notifications */}
                    <div className="border border-border rounded-lg p-4 space-y-4">
                      <div className="flex items-start gap-3">
                        <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <div className="text-sm font-semibold">Push notifikace</div>
                          <div className="text-xs text-muted-foreground">
                            Okamžitá upozornění v prohlížeči
                          </div>

                          {!pushSupported && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Push notifikace nejsou v tomto prohlížeči podporovány.
                            </p>
                          )}

                          {pushSupported && getNotificationPermission() === 'denied' && (
                            <NotificationBlockedGuide />
                          )}

                          {pushSupported && isIOS() && !isStandalone() && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                              Pro iOS je nutné přidat aplikaci na plochu.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4 pt-2 border-t border-border/50">
                        {/* Soft Push Onboarding / Diagnostic Banner */}
                        {pushSupported && !pushNotifications && (
                          <SoftPushOnboarding context="customer" onSubscribed={() => checkPushSupport(userId!)} />
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-3">
                            <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <div className="text-sm font-medium">Nové zprávy</div>
                              <div className="text-xs text-muted-foreground">Upozornění na nové zprávy</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {pushLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                            <Switch
                              checked={pushNotifications && pushNewMessages}
                              onCheckedChange={handleTogglePushNewMessages}
                              disabled={pushLoading || !pushNotifications || getNotificationPermission() === 'denied'}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-3">
                            <UserPlus className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <div className="text-sm font-medium">Nové nabídky</div>
                              <div className="text-xs text-muted-foreground">Upozornění když přijde nabídka</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {pushLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                            <Switch
                              checked={pushNotifications && pushNewOffers}
                              onCheckedChange={handleTogglePushNewOffers}
                              disabled={pushLoading || !pushNotifications || getNotificationPermission() === 'denied'}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-3">
                            <CheckCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <div className="text-sm font-medium">Dokončení zakázky</div>
                              <div className="text-xs text-muted-foreground">Upozornění když řemeslník dokončí práci</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {pushLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                            <Switch
                              checked={pushNotifications && pushJobCompleted}
                              onCheckedChange={handleTogglePushJobCompleted}
                              disabled={pushLoading || !pushNotifications || getNotificationPermission() === 'denied'}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <div className="text-sm font-medium">Povolit push notifikace</div>
                          <div className="flex items-center gap-2">
                            {pushLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                            <Switch
                              checked={pushNotifications}
                              onCheckedChange={(checked) => handleTogglePushNotifications(checked)}
                              disabled={pushLoading || !pushSupported}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Email Notifications */}
                    <div className="border border-border rounded-lg p-4 space-y-4">
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <div className="text-sm font-semibold">E-mailové notifikace</div>
                          <div className="text-xs text-muted-foreground">
                            Upozornění zasílaná na váš e-mail
                          </div>
                        </div>
                      </div>

                      {/* New Messages */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <div className="text-sm font-medium">Nové zprávy</div>
                            <div className="text-xs text-muted-foreground">E-mail o nových zprávách</div>
                          </div>
                        </div>
                        <Switch
                          checked={emailNotifications && emailNewMessages}
                          onCheckedChange={handleToggleEmailNewMessages}
                          disabled={!emailNotifications}
                        />
                      </div>

                      {/* New Offers */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <UserPlus className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <div className="text-sm font-medium">Nové nabídky</div>
                            <div className="text-xs text-muted-foreground">E-mail když řemeslník pošle nabídku</div>
                          </div>
                        </div>
                        <Switch
                          checked={emailNotifications && emailNewOffers}
                          onCheckedChange={handleToggleEmailNewOffers}
                          disabled={!emailNotifications}
                        />
                      </div>

                      {/* Job Completed */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <div className="text-sm font-medium">Dokončení zakázky</div>
                            <div className="text-xs text-muted-foreground">E-mail když řemeslník dokončí práci</div>
                          </div>
                        </div>
                        <Switch
                          checked={emailNotifications && emailJobCompleted}
                          onCheckedChange={handleToggleEmailJobCompleted}
                          disabled={!emailNotifications}
                        />
                      </div>

                      {/* Master toggle */}
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="text-sm font-medium">Povolit e-mailové notifikace</div>
                        <Switch
                          checked={emailNotifications}
                          onCheckedChange={setEmailNotifications}
                        />
                      </div>
                    </div>

                    {/* Marketing */}
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="marketing-notifications"
                        checked={marketingNotifications}
                        onCheckedChange={(checked) => setMarketingNotifications(checked as boolean)}
                      />
                      <div className="space-y-1">
                        <label
                          htmlFor="marketing-notifications"
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          Marketingové zprávy
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Souhlasím s obchodními sděleními
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </AccordionContent>
              </AccordionItem>

              {/* Account Management */}
              <AccordionItem value="account" className="border-b">
                <AccordionTrigger className="px-4 py-4 hover:no-underline">
                  <span className="text-sm font-medium">Správa účtu</span>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0 space-y-6">
                    {/* Email */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Přihlašovací email</label>
                      {editingEmail ? (
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            value={tempEmail}
                            onChange={(e) => setTempEmail(e.target.value)}
                          />
                          <Button onClick={handleUpdateEmail} size="sm">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button 
                            onClick={() => setEditingEmail(false)} 
                            variant="outline" 
                            size="sm"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-muted-foreground text-sm">
                            {authUser?.email || 'Není nastaveno'}
                          </p>
                          <Button
                            onClick={() => setEditingEmail(true)}
                            variant="ghost"
                            size="sm"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Telefonní číslo</label>
                      {editingPhone ? (
                        <div className="flex gap-2">
                          <Input
                            type="tel"
                            value={tempPhone}
                            onChange={(e) => setTempPhone(e.target.value)}
                            placeholder="+420..."
                          />
                          <Button onClick={handleUpdatePhone} size="sm">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button 
                            onClick={() => setEditingPhone(false)} 
                            variant="outline" 
                            size="sm"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-muted-foreground text-sm">
                            {profile?.phone || 'Není nastaveno'}
                          </p>
                          <Button
                            onClick={() => setEditingPhone(true)}
                            variant="ghost"
                            size="sm"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Password */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Heslo</label>
                      {editingPassword ? (
                        <div className="space-y-2">
                          <Input
                            type="password"
                            placeholder="Aktuální heslo"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                          />
                          <Input
                            type="password"
                            placeholder="Nové heslo"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                          <Input
                            type="password"
                            placeholder="Potvrdit nové heslo"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button onClick={handleChangePassword} size="sm">
                              Uložit
                            </Button>
                            <Button 
                              onClick={() => {
                                setEditingPassword(false);
                                setCurrentPassword('');
                                setNewPassword('');
                                setConfirmPassword('');
                              }} 
                              variant="outline" 
                              size="sm"
                            >
                              Zrušit
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setEditingPassword(true)}
                          variant="outline"
                          size="sm"
                        >
                          Změnit heslo
                        </Button>
                      )}
                    </div>

                    {/* Delete Account */}
                    <DeleteAccountSection 
                    isNativeApp={false} 
                    navigate={navigate} 
                    context="customer" 
                  />
                  </CardContent>
                </AccordionContent>
              </AccordionItem>

              {/* Sign Out */}
              <AccordionItem value="signout">
                <div className="px-4 py-4">
                  <Button
                    onClick={handleSignOut}
                    variant="destructive"
                    className="w-full"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Odhlásit se
                  </Button>
                </div>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>
      </div>
    );
  }

  // Desktop view - sidebar + content
  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-1 w-full px-3 md:px-0 pt-1 pb-6">
        <div className="mt-1 mb-1">
          <div className="flex items-center min-h-[36px] -mx-3 px-3 md:mx-0 md:px-0 pb-1">
            <h1 className="text-lg font-semibold text-foreground">Nastavení</h1>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Appearance */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 text-foreground">Vzhled</h2>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isDarkMode ? (
                    <Moon className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Sun className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Tmavý režim</p>
                    <p className="text-xs text-muted-foreground">
                      Přepnout mezi světlým a tmavým režimem
                    </p>
                  </div>
                </div>
                <Switch checked={isDarkMode} onCheckedChange={toggleDarkMode} />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 text-foreground">Oznámení</h2>
              <div className="space-y-6">
                      {/* Push Notifications */}
                      <div className="border border-border rounded-lg p-4 space-y-4">
                        <div className="flex items-start gap-3">
                          <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <div className="text-sm font-semibold">Push notifikace</div>
                            <div className="text-xs text-muted-foreground">
                              Okamžitá upozornění v prohlížeči
                            </div>

                            {!pushSupported && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Push notifikace nejsou v tomto prohlížeči podporovány.
                              </p>
                            )}

                            {pushSupported && getNotificationPermission() === 'denied' && (
                              <NotificationBlockedGuide />
                            )}

                            {pushSupported && isIOS() && !isStandalone() && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                Pro iOS je nutné přidat aplikaci na plochu.
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4 pt-2 border-t border-border/50">
                          {/* Soft Push Onboarding / Diagnostic Banner */}
                          {pushSupported && !pushNotifications && (
                            <SoftPushOnboarding context="customer" onSubscribed={() => checkPushSupport(userId!)} />
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-start gap-3">
                              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <div className="text-sm font-medium">Nové zprávy</div>
                                <div className="text-xs text-muted-foreground">Upozornění o nové zprávě</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {pushLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                              <Switch
                                checked={pushNotifications && pushNewMessages}
                                onCheckedChange={handleTogglePushNewMessages}
                                disabled={pushLoading || !pushNotifications || getNotificationPermission() === 'denied'}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-start gap-3">
                              <UserPlus className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <div className="text-sm font-medium">Nové nabídky</div>
                                <div className="text-xs text-muted-foreground">Upozornění když přijde nabídka</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {pushLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                              <Switch
                                checked={pushNotifications && pushNewOffers}
                                onCheckedChange={handleTogglePushNewOffers}
                                disabled={pushLoading || !pushNotifications || getNotificationPermission() === 'denied'}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-start gap-3">
                              <CheckCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <div className="text-sm font-medium">Dokončení zakázky</div>
                                <div className="text-xs text-muted-foreground">Upozornění když řemeslník dokončí práci</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {pushLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                              <Switch
                                checked={pushNotifications && pushJobCompleted}
                                onCheckedChange={handleTogglePushJobCompleted}
                                disabled={pushLoading || !pushNotifications || getNotificationPermission() === 'denied'}
                              />
                            </div>
                          </div>

                          {/* Master toggle */}
                          <div className="flex items-center justify-between pt-2 border-t border-border">
                            <div className="text-sm font-medium">Povolit push notifikace</div>
                            <div className="flex items-center gap-2">
                              {pushLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                              <Switch
                                checked={pushNotifications}
                                onCheckedChange={(checked) => handleTogglePushNotifications(checked)}
                                disabled={pushLoading || !pushSupported}
                              />
                            </div>
                          </div>
                        </div>
                      </div>


                {/* Email Notifications */}
                <div className="mt-6 border border-border rounded-lg p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">E-mailové notifikace</div>
                      <div className="text-xs text-muted-foreground">
                        Upozornění zasílaná na váš e-mail
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="text-sm font-medium">Nové zprávy</div>
                        <div className="text-xs text-muted-foreground">E-mail o nových zprávách</div>
                      </div>
                    </div>
                    <Switch
                      checked={emailNotifications && emailNewMessages}
                      onCheckedChange={handleToggleEmailNewMessages}
                      disabled={!emailNotifications}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <UserPlus className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="text-sm font-medium">Nové nabídky</div>
                        <div className="text-xs text-muted-foreground">E-mail když řemeslník pošle nabídku</div>
                      </div>
                    </div>
                    <Switch
                      checked={emailNotifications && emailNewOffers}
                      onCheckedChange={handleToggleEmailNewOffers}
                      disabled={!emailNotifications}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="text-sm font-medium">Dokončení zakázky</div>
                        <div className="text-xs text-muted-foreground">E-mail když řemeslník dokončí práci</div>
                      </div>
                    </div>
                    <Switch
                      checked={emailNotifications && emailJobCompleted}
                      onCheckedChange={handleToggleEmailJobCompleted}
                      disabled={!emailNotifications}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="text-sm font-medium">Povolit e-mailové notifikace</div>
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>
                </div>

                {/* Marketing */}
                <div className="mt-6 flex items-start space-x-3">
                  <Checkbox
                    id="marketing-desktop"
                    checked={marketingNotifications}
                    onCheckedChange={(checked) => setMarketingNotifications(checked as boolean)}
                  />
                  <div className="space-y-1">
                    <label
                      htmlFor="marketing-desktop"
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      Marketingové zprávy
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Souhlasím s obchodními sděleními
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Management Desktop */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Pencil className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Správa účtu</h3>
                  <p className="text-sm text-muted-foreground">
                    Změna e-mailu, telefonu nebo hesla
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Email */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Přihlašovací email</label>
                  {editingEmail ? (
                    <div className="flex gap-2 max-w-md">
                      <Input
                        type="email"
                        value={tempEmail}
                        onChange={(e) => setTempEmail(e.target.value)}
                      />
                      <Button size="sm" onClick={handleUpdateEmail}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingEmail(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border max-w-md">
                      <span className="text-sm">{authUser?.email}</span>
                      <Button variant="ghost" size="sm" onClick={() => setEditingEmail(true)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Upravit
                      </Button>
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Telefonní číslo</label>
                  {editingPhone ? (
                    <div className="flex gap-2 max-w-md">
                      <Input
                        type="tel"
                        value={tempPhone}
                        onChange={(e) => setTempPhone(e.target.value)}
                        placeholder="+420..."
                      />
                      <Button size="sm" onClick={handleUpdatePhone}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingPhone(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border max-w-md">
                      <span className="text-sm">{profile?.phone || 'Nezadáno'}</span>
                      <Button variant="ghost" size="sm" onClick={() => setEditingPhone(true)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Upravit
                      </Button>
                    </div>
                  )}
                </div>

                {/* Password */}
                <div className="max-w-md">
                  <label className="text-sm font-medium mb-2 block">Heslo</label>
                  {editingPassword ? (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
                      <Input
                        type="password"
                        placeholder="Aktuální heslo"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                      <Input
                        type="password"
                        placeholder="Nové heslo"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <Input
                        type="password"
                        placeholder="Potvrdit nové heslo"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" onClick={handleChangePassword}>
                          Změnit heslo
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          setEditingPassword(false);
                          setCurrentPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                        }}>
                          Zrušit
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full" onClick={() => setEditingPassword(true)}>
                      Změnit heslo
                    </Button>
                  )}
                </div>
                
                <div className="pt-6 border-t border-border max-w-md">
                  <DeleteAccountSection 
                    isNativeApp={false} 
                    navigate={navigate} 
                    context="customer" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sign Out Desktop */}
          <div className="flex justify-end pt-4">
            <Button variant="destructive" size="lg" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Odhlásit se
            </Button>
          </div>
        </div>
      </div>
      <AddToHomeScreenModal open={showAddToHomeScreen} onOpenChange={setShowAddToHomeScreen} />
    </div>
  );
};

export default CustomerSettings;
