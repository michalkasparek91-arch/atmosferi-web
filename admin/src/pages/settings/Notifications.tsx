import { useState, useEffect } from "react";
import NotificationBlockedGuide, { getBlockedNotificationToastDescription } from "@/components/NotificationBlockedGuide";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Pencil, Check, X, Bell, Briefcase, MessageSquare, Loader2, UserPlus, CheckCircle, ThumbsUp, Mail, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { AddToHomeScreenModal } from "@/components/AddToHomeScreenModal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  isPushSupported,
  isIOS,
  isStandalone,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribedToPush,
  getNotificationPermission,
  checkAndRepairSubscription,
  nukePushSystem,
} from "@/lib/push-notifications";


const Notifications = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [profile, setProfile] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userType, setUserType] = useState<string>('customer');
  // Detect if we're in worker context from the route
  const isWorkerRoute = location.pathname.startsWith('/remeslnik');
  const [editingEmail, setEditingEmail] = useState(false);
  const [tempEmail, setTempEmail] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingNotifications, setMarketingNotifications] = useState(false);
  
  // Push notification states
  const [pushNotifications, setPushNotifications] = useState(false);
  const [pushNewJobs, setPushNewJobs] = useState(true);
  const [pushNewMessages, setPushNewMessages] = useState(true);
  const [pushNewOffers, setPushNewOffers] = useState(true);
  const [pushJobCompleted, setPushJobCompleted] = useState(true);
  const [pushOfferAccepted, setPushOfferAccepted] = useState(true);
  const [pushLowCredits, setPushLowCredits] = useState(true);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [showAddToHomeScreen, setShowAddToHomeScreen] = useState(false);
  const [isNuking, setIsNuking] = useState(false);
  
  // Email notification states (individual toggles)
  const [emailNewJobs, setEmailNewJobs] = useState(true);
  const [emailNewMessages, setEmailNewMessages] = useState(true);
  const [emailNewOffers, setEmailNewOffers] = useState(true);
  const [emailJobCompleted, setEmailJobCompleted] = useState(true);
  const [emailOfferAccepted, setEmailOfferAccepted] = useState(true);
  const [emailLowCredits, setEmailLowCredits] = useState(true);

  useEffect(() => {
    loadProfile();
    checkPushSupport();
  }, []);

  async function checkPushSupport() {
    const supported = isPushSupported();
    setPushSupported(supported);
    
    if (!supported) {
      setPushNotifications(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    // Base switch primarily on true local browser subscription state
    const isSubscribed = await isSubscribedToPush();
    setPushNotifications(isSubscribed);

    if (session?.user?.id) {
      // Background repair: re-register subscription if missing
      checkAndRepairSubscription(session.user.id).then((repaired) => {
        if (repaired && !isSubscribed) {
          setPushNotifications(true);
        }
      }).catch(err => {
        console.error('[Notifications] Background repair error:', err);
      });
    }
  }

  async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setUserId(session.user.id);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
      setUserType(profileData.user_type || 'customer');
      setTempEmail(profileData.email || '');
      setEmailNotifications(profileData.email_notifications ?? true);
      setMarketingNotifications(profileData.marketing_notifications ?? false);
      setPushNotifications(profileData.push_notifications ?? false);
      setPushNewJobs((profileData as any).push_new_jobs ?? true);
      setPushNewMessages((profileData as any).push_new_messages ?? true);
      setPushNewOffers((profileData as any).push_new_offers ?? true);
      setPushJobCompleted((profileData as any).push_job_completed ?? true);
      setPushOfferAccepted((profileData as any).push_offer_accepted ?? true);
      setPushLowCredits((profileData as any).push_low_credits ?? true);
      
      // Load individual email notification preferences
      setEmailNewJobs((profileData as any).email_new_jobs ?? true);
      setEmailNewMessages((profileData as any).email_new_messages ?? true);
      setEmailNewOffers((profileData as any).email_new_offers ?? true);
      setEmailJobCompleted((profileData as any).email_job_completed ?? true);
      setEmailOfferAccepted((profileData as any).email_offer_accepted ?? true);
      setEmailLowCredits((profileData as any).email_low_credits ?? true);
    }
  }

  const handleSaveEmail = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('profiles')
      .update({ email: tempEmail })
      .eq('id', session.user.id);

    if (!error) {
      setProfile({ ...profile, email: tempEmail });
      setEditingEmail(false);
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

  const handleSavePushPreferences = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase
      .from('profiles')
      .update({
        push_new_jobs: pushNewJobs,
        push_new_messages: pushNewMessages,
        push_new_offers: pushNewOffers,
        push_job_completed: pushJobCompleted,
        push_offer_accepted: pushOfferAccepted,
        push_low_credits: pushLowCredits,
      } as any)
      .eq('id', session.user.id);
  };

  const handleSaveEmailPreferences = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase
      .from('profiles')
      .update({
        email_new_jobs: emailNewJobs,
        email_new_messages: emailNewMessages,
        email_new_offers: emailNewOffers,
        email_job_completed: emailJobCompleted,
        email_offer_accepted: emailOfferAccepted,
        email_low_credits: emailLowCredits,
      } as any)
      .eq('id', session.user.id);
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
      // Explicit bounce back
      setPushNotifications(false);
      return false;
    }

    setPushLoading(true);
    try {
      if (enabled) {
        // subscribeToPush now requests permission immediately at the top
        const success = await subscribeToPush(userId);
        if (!success && getNotificationPermission() === 'default') {
          // If it returned false but permission is still default, user might have closed the prompt
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
          description: "Nebudete dostávat žádná push upozornění v tomto prohlížeči.",
        });
      }

      return subscribed === enabled;
    } catch (error: any) {
      console.error('Push notification error:', error);

      if (error.code === 'IOS_NOT_STANDALONE') {
        setShowAddToHomeScreen(true);
      } else if (error.message?.includes('denied') || getNotificationPermission() === 'denied') {
        toast({
          title: "Oprávnění zamítnuto",
          description: getBlockedNotificationToastDescription(),
          variant: "destructive",
        });
      } else if (error.message?.includes('permission') || error.message?.includes('denied')) {
        // Silent fail or user closed prompt
      } else {
        toast({
          title: "Chyba",
          description: error.message || "Nepodařilo se nastavit push notifikace.",
          variant: "destructive",
        });
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

  const ensureEmailEnabled = () => {
    if (!emailNotifications) {
      setEmailNotifications(true);
    }
    return true;
  };

  const handleTogglePushNewJobs = async (enabled: boolean) => {
    if (enabled) {
      const ok = await ensurePushEnabled();
      if (!ok) return;
    }
    setPushNewJobs(enabled);
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

  const handleTogglePushOfferAccepted = async (enabled: boolean) => {
    if (enabled) {
      const ok = await ensurePushEnabled();
      if (!ok) return;
    }
    setPushOfferAccepted(enabled);
  };

  const handleTogglePushLowCredits = async (enabled: boolean) => {
    if (enabled) {
      const ok = await ensurePushEnabled();
      if (!ok) return;
    }
    setPushLowCredits(enabled);
  };

  // Email toggle handlers
  const handleToggleEmailNewJobs = (enabled: boolean) => {
    if (enabled) ensureEmailEnabled();
    setEmailNewJobs(enabled);
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

  const handleToggleEmailOfferAccepted = (enabled: boolean) => {
    if (enabled) ensureEmailEnabled();
    setEmailOfferAccepted(enabled);
  };

  const handleToggleEmailLowCredits = (enabled: boolean) => {
    if (enabled) ensureEmailEnabled();
    setEmailLowCredits(enabled);
  };

  const handleNukeSystem = async () => {
    if (!userId) return;
    setIsNuking(true);
    try {
      await nukePushSystem(userId);
      toast({
        title: "Systém resetován",
        description: "Obnovte tuto stránku a zkuste notifikace zapnout znovu. Nyní by se měl prohlížeč znovu zeptat.",
      });
      setPushNotifications(false);
    } catch (error) {
      toast({
        title: "Chyba při resetování",
        description: "Něco se pokazilo. Zkuste to prosím znovu.",
        variant: "destructive"
      });
    } finally {
      setIsNuking(false);
    }
  };

  // Auto-save when checkboxes change
  useEffect(() => {
    if (profile) {
      handleSaveNotificationPreferences();
    }
  }, [emailNotifications, marketingNotifications]);

  // Auto-save push preferences when they change
  useEffect(() => {
    if (profile && pushNotifications) {
      handleSavePushPreferences();
    }
  }, [pushNewJobs, pushNewMessages, pushNewOffers, pushJobCompleted, pushOfferAccepted, pushLowCredits]);

  // Auto-save email preferences when they change
  useEffect(() => {
    if (profile) {
      handleSaveEmailPreferences();
    }
  }, [emailNewJobs, emailNewMessages, emailNewOffers, emailJobCompleted, emailOfferAccepted, emailLowCredits]);

  const permission = getNotificationPermission();
  const isBlocked = permission === 'denied';

  const renderPushNotificationStatus = () => {
    if (!pushSupported) {
      return (
        <p className="text-xs text-muted-foreground mt-1">
          Push notifikace nejsou v tomto prohlížeči podporovány.
        </p>
      );
    }

    if (isBlocked) {
      return <NotificationBlockedGuide />;
    }

    if (isIOS() && !isStandalone()) {
      return (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          Pro iOS je nutné přidat aplikaci na plochu.
        </p>
      );
    }

    return null;
  };

  // Use route to determine context - worker route means worker context
  const isWorker = isWorkerRoute || userType === 'worker' || userType === 'both';
  const isCustomer = !isWorkerRoute && (userType === 'customer' || userType === 'both');

  // Determine back navigation based on user type
  const getBackPath = () => {
    if (userType === 'worker' || userType === 'both') {
      return '/remeslnik/nastaveni';
    }
    return '/zakaznik/nastaveni';
  };

  return (
    <div className="min-h-screen px-3 md:px-0 pt-4 md:pt-8 pb-6">
      <div className="w-full space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(getBackPath())}
          className="mb-2 -ml-2 text-muted-foreground hover:text-foreground rounded-full"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zpět do nastavení
        </Button>

        <Card className="rounded-2xl border shadow-sm">
          <CardContent className="p-6 space-y-6">
            {/* Email Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Email</label>
                {!editingEmail && (
                  <Button 
                    onClick={() => setEditingEmail(true)}
                    variant="ghost"
                    size="sm"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {editingEmail ? (
                <div className="space-y-2">
                  <Input
                    type="email"
                    value={tempEmail}
                    onChange={(e) => setTempEmail(e.target.value)}
                    placeholder="váš@email.cz"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEmail}>
                      <Check className="h-4 w-4 mr-1" />
                      Uložit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setEditingEmail(false);
                        setTempEmail(profile?.email || '');
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Zrušit
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{profile?.email || 'Email není nastaven'}</p>
              )}
            </div>

            {/* Push Notifications Section */}
            <div className="py-4 border-t border-border space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <label className="text-sm font-medium">Push notifikace</label>
                    <p className="text-sm text-muted-foreground">
                      Okamžitá upozornění v prohlížeči
                    </p>
                    {renderPushNotificationStatus()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pushLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Switch
                    checked={pushNotifications}
                    onCheckedChange={handleTogglePushNotifications}
                    disabled={pushLoading || !pushSupported || isBlocked}
                  />
                </div>
              </div>

              {/* Worker-specific: New Jobs Toggle */}
              {isWorker && (
                <div className="flex items-center justify-between ml-8">
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <label className="text-sm font-medium">
                        Nové zakázky
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Upozornění na nové zakázky ve vaší oblasti
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pushLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Switch
                      checked={pushNotifications && pushNewJobs}
                      onCheckedChange={handleTogglePushNewJobs}
                      disabled={pushLoading || !pushSupported || isBlocked}
                    />
                  </div>
                </div>
              )}

              {/* Worker-specific: Offer Accepted Toggle */}
              {isWorker && (
                <div className="flex items-center justify-between ml-8">
                  <div className="flex items-start gap-3">
                    <ThumbsUp className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <label className="text-sm font-medium">
                        Přijatá nabídka
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Upozornění když zákazník přijme vaši nabídku
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pushLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Switch
                      checked={pushNotifications && pushOfferAccepted}
                      onCheckedChange={handleTogglePushOfferAccepted}
                      disabled={pushLoading || !pushSupported || isBlocked}
                    />
                  </div>
                </div>
              )}

              {/* Worker-specific: Low Credits Toggle */}
              {isWorker && (
                <div className="flex items-center justify-between ml-8">
                  <div className="flex items-start gap-3">
                    <Coins className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <label className="text-sm font-medium">
                        Nízký počet kreditů
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Upozornění když máte méně než 9 kreditů
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pushLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Switch
                      checked={pushNotifications && pushLowCredits}
                      onCheckedChange={handleTogglePushLowCredits}
                      disabled={pushLoading || !pushSupported || isBlocked}
                    />
                  </div>
                </div>
              )}

              {/* Customer-specific: New Offers Toggle */}
              {isCustomer && (
                <div className="flex items-center justify-between ml-8">
                  <div className="flex items-start gap-3">
                    <UserPlus className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <label className="text-sm font-medium">
                        Nové nabídky
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Upozornění když řemeslník pošle nabídku
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pushLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Switch
                      checked={pushNotifications && pushNewOffers}
                      onCheckedChange={handleTogglePushNewOffers}
                      disabled={pushLoading || !pushSupported || isBlocked}
                    />
                  </div>
                </div>
              )}

              {/* Customer-specific: Job Completed Toggle */}
              {isCustomer && (
                <div className="flex items-center justify-between ml-8">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <label className="text-sm font-medium">
                        Dokončení zakázky
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Upozornění když řemeslník dokončí práci
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pushLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Switch
                      checked={pushNotifications && pushJobCompleted}
                      onCheckedChange={handleTogglePushJobCompleted}
                      disabled={pushLoading || !pushSupported || isBlocked}
                    />
                  </div>
                </div>
              )}

              {/* New Messages Toggle - for all users */}
              <div className="flex items-center justify-between ml-8">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <label className="text-sm font-medium">
                      Nové zprávy
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Upozornění na nové zprávy v konverzacích
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pushLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Switch
                    checked={pushNotifications && pushNewMessages}
                    onCheckedChange={handleTogglePushNewMessages}
                    disabled={pushLoading || !pushSupported || isBlocked}
                  />
                </div>
              </div>
            </div>

            {/* Email Notifications Section */}
            <div className="py-4 border-t border-border space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <label className="text-sm font-medium">E-mailové notifikace</label>
                    <p className="text-sm text-muted-foreground">
                      Upozornění zasílaná na váš e-mail
                    </p>
                  </div>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              {/* Worker-specific: New Jobs Email Toggle */}
              {isWorker && (
                <div className="flex items-center justify-between ml-8">
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <label className="text-sm font-medium">
                        Nové zakázky
                      </label>
                      <p className="text-xs text-muted-foreground">
                        E-mail o nových zakázkách ve vaší oblasti
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={emailNotifications && emailNewJobs}
                    onCheckedChange={handleToggleEmailNewJobs}
                    disabled={!emailNotifications}
                  />
                </div>
              )}

              {/* Worker-specific: Offer Accepted Email Toggle */}
              {isWorker && (
                <div className="flex items-center justify-between ml-8">
                  <div className="flex items-start gap-3">
                    <ThumbsUp className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <label className="text-sm font-medium">
                        Přijatá nabídka
                      </label>
                      <p className="text-xs text-muted-foreground">
                        E-mail když zákazník přijme vaši nabídku
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={emailNotifications && emailOfferAccepted}
                    onCheckedChange={handleToggleEmailOfferAccepted}
                    disabled={!emailNotifications}
                  />
                </div>
              )}

              {/* Worker-specific: Low Credits Email Toggle */}
              {isWorker && (
                <div className="flex items-center justify-between ml-8">
                  <div className="flex items-start gap-3">
                    <Coins className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <label className="text-sm font-medium">
                        Nízký počet kreditů
                      </label>
                      <p className="text-xs text-muted-foreground">
                        E-mail když máte méně než 9 kreditů
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={emailNotifications && emailLowCredits}
                    onCheckedChange={handleToggleEmailLowCredits}
                    disabled={!emailNotifications}
                  />
                </div>
              )}

              {/* Customer-specific: New Offers Email Toggle */}
              {isCustomer && (
                <div className="flex items-center justify-between ml-8">
                  <div className="flex items-start gap-3">
                    <UserPlus className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <label className="text-sm font-medium">
                        Nové nabídky
                      </label>
                      <p className="text-xs text-muted-foreground">
                        E-mail když řemeslník pošle nabídku
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={emailNotifications && emailNewOffers}
                    onCheckedChange={handleToggleEmailNewOffers}
                    disabled={!emailNotifications}
                  />
                </div>
              )}

              {/* Customer-specific: Job Completed Email Toggle */}
              {isCustomer && (
                <div className="flex items-center justify-between ml-8">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <label className="text-sm font-medium">
                        Dokončení zakázky
                      </label>
                      <p className="text-xs text-muted-foreground">
                        E-mail když řemeslník dokončí práci
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={emailNotifications && emailJobCompleted}
                    onCheckedChange={handleToggleEmailJobCompleted}
                    disabled={!emailNotifications}
                  />
                </div>
              )}

              {/* New Messages Email Toggle - for all users */}
              <div className="flex items-center justify-between ml-8">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <label className="text-sm font-medium">
                      Nové zprávy
                    </label>
                    <p className="text-xs text-muted-foreground">
                      E-mail o nových zprávách v konverzacích
                    </p>
                  </div>
                </div>
                <Switch
                  checked={emailNotifications && emailNewMessages}
                  onCheckedChange={handleToggleEmailNewMessages}
                  disabled={!emailNotifications}
                />
              </div>
            </div>

            {/* Marketing Checkbox */}
            <div className="flex items-start space-x-3 py-4 border-t border-border">
              <Checkbox
                id="marketingNotifications"
                checked={marketingNotifications}
                onCheckedChange={(checked) => setMarketingNotifications(checked as boolean)}
              />
              <div className="flex-1">
                <label
                  htmlFor="marketingNotifications"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Marketingové zprávy
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Zaškrtnutím výše uvedeného pole souhlasím s tím, že mi Pracetoč bude zasílat obchodní informace (např. newslettery, SMS zprávy) prostřednictvím elektronických prostředků komunikace a telekomunikačních zařízení.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Accordion type="single" collapsible className="w-full mt-4">
          <AccordionItem value="troubleshooting" className="border-none px-4 md:px-0">
            <AccordionTrigger className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Řešení potíží
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Pokud vám na tomto zařízení nechodí upozornění, ačkoliv je máte povolená, můžete zkusit resetovat komunikační službu.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleNukeSystem}
                disabled={isNuking}
                className="w-full sm:w-auto"
              >
                {isNuking && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Resetovat push notifikace
              </Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <AddToHomeScreenModal 
        open={showAddToHomeScreen} 
        onOpenChange={setShowAddToHomeScreen} 
      />
    </div>
  );
};

export default Notifications;
