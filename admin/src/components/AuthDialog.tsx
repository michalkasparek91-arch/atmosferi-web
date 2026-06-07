import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, RefreshCw, ArrowLeft, User, Wrench } from "lucide-react";
import PasswordStrengthMeter from "@/components/PasswordStrengthMeter";
import { useSession } from "@/providers/SessionProvider";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStep?: AuthStep;
}

type AuthStep = "email" | "login" | "register-type" | "register" | "email-verification" | "password-reset-sent";

const SocialButtons = ({
  onGoogle,
  onFacebook,
  disabled,
}: {
  onGoogle: () => void;
  onFacebook: () => void;
  disabled?: boolean;
}) => (
  <>
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <Separator />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card px-2 text-muted-foreground">Nebo</span>
      </div>
    </div>
    <div className="flex gap-3">
      <Button
        type="button"
        variant="outline"
        className="flex-1 h-12 bg-background hover:bg-muted border-border"
        onClick={onGoogle}
        disabled={disabled}
      >
        <svg className="w-7 h-7" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      </Button>
      <Button
        type="button"
        variant="outline"
        className="flex-1 h-12 bg-background hover:bg-muted border-border"
        onClick={onFacebook}
        disabled={disabled}
      >
        <svg className="w-7 h-7" viewBox="0 0 24 24">
          <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </Button>
    </div>
  </>
);

const AuthDialog = ({ open, onOpenChange, initialStep }: AuthDialogProps) => {
  const navigate = useNavigate();
  const { session, profile } = useSession();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<AuthStep>("email");
  const [userType, setUserType] = useState<'customer' | 'worker'>('customer');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  
  const [showResendOption, setShowResendOption] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const [promoCode, setPromoCode] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep(initialStep || "email");
      setPassword("");
      if (!session) {
        setFullName("");
      }
      setShowResendOption(false);
    }
  }, [open, initialStep, session]);

  useEffect(() => {
    if (session) {
      const googleName = session.user?.user_metadata?.full_name || session.user?.user_metadata?.name || profile?.full_name || "";
      if (googleName && !fullName) {
        setFullName(googleName);
      }
      if (session.user?.email && !email) {
        setEmail(session.user.email);
      }
    }
  }, [session, profile, fullName, email]);

  // Animate step transitions
  const changeStep = (newStep: AuthStep) => {
    setAnimating(true);
    setTimeout(() => {
      setStep(newStep);
      setAnimating(false);
    }, 150);
  };

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode);
      sessionStorage.setItem('referralCode', refCode);
    } else {
      const storedRefCode = sessionStorage.getItem('referralCode');
      if (storedRefCode) {
        setReferralCode(storedRefCode);
      }
    }

    const promo = searchParams.get('promo');
    if (promo) {
      setPromoCode(promo);
      sessionStorage.setItem('promoCode', promo);
    } else {
      const storedPromo = sessionStorage.getItem('promoCode');
      if (storedPromo) {
        setPromoCode(storedPromo);
      }
    }
  }, [searchParams]);

  const checkEmailExists = async (emailToCheck: string): Promise<{ exists: boolean; confirmed: boolean }> => {
    try {
      const response = await supabase.functions.invoke("check-email-exists", {
        body: { email: emailToCheck },
      });
      return {
        exists: response.data?.exists ?? false,
        confirmed: response.data?.confirmed ?? true,
      };
    } catch {
      return { exists: false, confirmed: true };
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setCheckingEmail(true);
    try {
      const { exists, confirmed } = await checkEmailExists(email);
      if (exists && !confirmed) {
        setVerificationEmail(email);
        changeStep("email-verification");
      } else if (exists) {
        changeStep("login");
      } else {
        changeStep("register-type");
      }
    } catch {
      changeStep("login");
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleResendConfirmation = async () => {
    const targetEmail = verificationEmail || email;
    if (!targetEmail) {
      toast.error("Zadejte prosím email");
      return;
    }
    
    setResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      
      if (error) throw error;
      
      toast.success("Potvrzovací email byl odeslán!");
      setShowResendOption(false);
    } catch (error: any) {
      toast.error(error.message || "Nepodařilo se odeslat email");
    } finally {
      setResendingEmail(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowResendOption(false);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        if (error.message.includes("Email not confirmed")) {
          setVerificationEmail(email);
          changeStep("email-verification");
          return;
        }
        throw error;
      }
      toast.success("Úspěšně přihlášeno!");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Něco se pokazilo");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowResendOption(false);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
            user_type: userType,
            referral_code: referralCode || undefined,
            promo_code: promoCode || undefined,
            marketing_consent: marketingAccepted,
            terms_accepted_at: new Date().toISOString(),
            privacy_policy_accepted_at: new Date().toISOString(),
          },
        },
      });
      
      if (data.user && promoCode) {
        sessionStorage.removeItem('promoCode');
      }
      
      if (error) {
        if (error.message.includes("User already registered")) {
          setShowResendOption(true);
          toast.error("Tento email je již zaregistrován.");
          changeStep("login");
          return;
        }
        throw error;
      }

      if (userType === 'worker') {
        sessionStorage.setItem('pendingWorkerOnboarding', 'true');
      }

      if (data.user && referralCode) {
        const { data: referrer } = await supabase
          .from('profiles')
          .select('id')
          .eq('referral_code', referralCode)
          .maybeSingle();
        
        if (referrer) {
          await supabase
            .from('profiles')
            .update({ referred_by: referrer.id })
            .eq('id', data.user.id);
        }
        sessionStorage.removeItem('referralCode');
      }

      if (data.user && !data.session) {
        setVerificationEmail(email);
        changeStep("email-verification");
      } else {
        // Log conversion (if session exists, they are immediately signed in)
        import('@/lib/analytics').then(({ analytics }) => {
          analytics.trackConversion('registration', { 
            user_type: userType 
          });
        });

        toast.success("Účet úspěšně vytvořen!");
        onOpenChange(false);
      }
    } catch (error: any) {
      toast.error(error.message || "Něco se pokazilo");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    setLoading(true);

    try {
      // Update auth user metadata so the session immediately has the new metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          user_type: userType,
          marketing_consent: marketingAccepted,
          terms_accepted_at: new Date().toISOString(),
          privacy_policy_accepted_at: new Date().toISOString(),
        }
      });
      if (authError) throw authError;

      // Update user profile directly
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          user_type: userType,
        })
        .eq('id', session.user.id);

      if (profileError) throw profileError;

      // Handle referrals for OAuth
      if (referralCode) {
        const { data: referrer } = await supabase
          .from('profiles')
          .select('id')
          .eq('referral_code', referralCode)
          .maybeSingle();
        
        if (referrer) {
          await supabase
             .from('profiles')
             .update({ referred_by: referrer.id })
             .eq('id', session.user.id);
        }
        sessionStorage.removeItem('referralCode');
      }

      if (promoCode) {
        sessionStorage.removeItem('promoCode');
      }

      if (userType === 'worker') {
        sessionStorage.setItem('pendingWorkerOnboarding', 'true');
        toast.success("Nastavení profilu dokončeno!");
        onOpenChange(false);
        let postAuthRedirect = localStorage.getItem("postAuthRedirect") || sessionStorage.getItem("postAuthRedirect");
        
        // Fallback: If postAuthRedirect is missing but we have a sniperJobId, assume we want to go back to the shared job
        if (!postAuthRedirect) {
          const sniperJobId = localStorage.getItem("sniperJobId") || sessionStorage.getItem("sniperJobId");
          if (sniperJobId) {
            postAuthRedirect = `/sdilena-zakazka/${sniperJobId}`;
          }
        }

        if (postAuthRedirect) {
          localStorage.removeItem("postAuthRedirect");
          sessionStorage.removeItem("postAuthRedirect");
          navigate(postAuthRedirect, { replace: true });
        } else {
          navigate("/registrace-remeslnika", { replace: true });
        }
      } else {
        // Log conversion
        import('@/lib/analytics').then(({ analytics }) => {
          analytics.trackConversion('registration', { 
            user_type: userType 
          });
        });
        toast.success("Účet úspěšně nastaven!");
        onOpenChange(false);
        let postAuthRedirect = localStorage.getItem("postAuthRedirect") || sessionStorage.getItem("postAuthRedirect");
        
        // Fallback: If postAuthRedirect is missing but we have a sniperJobId, assume we want to go back to the shared job
        if (!postAuthRedirect) {
          const sniperJobId = localStorage.getItem("sniperJobId") || sessionStorage.getItem("sniperJobId");
          if (sniperJobId) {
            postAuthRedirect = `/sdilena-zakazka/${sniperJobId}`;
          }
        }

        if (postAuthRedirect) {
          localStorage.removeItem("postAuthRedirect");
          sessionStorage.removeItem("postAuthRedirect");
          navigate(postAuthRedirect, { replace: true });
        } else {
          navigate("/zakaznik/nova-zakazka", { replace: true });
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Něco se pokazilo při ukládání profilu");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const redirectPath = localStorage.getItem("postAuthRedirect") || sessionStorage.getItem("postAuthRedirect") || "";
      const redirectUrl = new URL(`${window.location.origin}/`);
      if (redirectPath) {
        redirectUrl.searchParams.set("redirect", redirectPath);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl.toString(),
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Přihlášení přes Google selhalo");
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      const redirectPath = localStorage.getItem("postAuthRedirect") || sessionStorage.getItem("postAuthRedirect") || "";
      const redirectUrl = new URL(`${window.location.origin}/`);
      if (redirectPath) {
        redirectUrl.searchParams.set("redirect", redirectPath);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: redirectUrl.toString(),
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Přihlášení přes Facebook selhalo");
    }
  };

  const handleBack = () => {
    if (step === "email-verification") return;
    if (step === "login" || step === "register-type") {
      changeStep("email");
      setPassword("");
    } else if (step === "register") {
      changeStep("register-type");
      setPassword("");
      setFullName("");
    }
  };

  const getTitle = () => {
    switch (step) {
      case "email": return "Přihlášení";
      case "login": return "Vítejte zpět";
      case "register-type": return "Vyberte typ účtu";
      case "register": return "Registrace";
      case "email-verification": return "Čekáme na potvrzení";
      case "password-reset-sent": return "";
    }
  };

  const getDescription = () => {
    switch (step) {
      case "email": return "Zadejte svůj email pro pokračování";
      case "login": return email;
      case "register-type": return "Registrujete se jako pracovník nebo zákazník?";
      case "register": return email;
      case "email-verification": return "";
      case "password-reset-sent": return "";
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={`sm:max-w-md max-sm:h-full max-sm:max-h-screen max-sm:rounded-none max-sm:border-0 max-sm:flex max-sm:flex-col max-sm:justify-start max-sm:pt-12 max-sm:top-0 max-sm:left-0 max-sm:translate-x-0 max-sm:translate-y-0 transition-all duration-300 ${
          step === "password-reset-sent" 
            ? "bg-[#1a1f1a] border-[#1a1f1a] text-white" 
            : "bg-card text-foreground"
        }`}>
          <DialogHeader className={step === "password-reset-sent" ? "hidden" : ""}>
            {step !== "email" && step !== "email-verification" && step !== "password-reset-sent" && (
              <button
                type="button"
                onClick={handleBack}
                className={`absolute left-2.5 top-2.5 w-10 h-10 flex items-center justify-center rounded-full transition-all hover:bg-muted active:scale-95 ${
                  (step as string) === "password-reset-sent" ? "text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <DialogTitle className="text-2xl font-bold text-center">
              {getTitle()}
            </DialogTitle>
            <DialogDescription className="text-center">
              {getDescription()}
            </DialogDescription>
          </DialogHeader>

          <div
            className={`space-y-4 py-4 transition-all duration-150 ${
              animating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
            }`}
          >
            {/* Step 1: Email input */}
            {step === "email" && (
              <>
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={checkingEmail}
                      autoFocus
                      autoComplete="email"
                      placeholder="vas@email.cz"
                      className="border-border focus:border-primary bg-background h-12"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={checkingEmail || !email}>
                    {checkingEmail ? "Ověřuji..." : "Pokračovat"}
                  </Button>
                </form>

                <SocialButtons
                  onGoogle={handleGoogleSignIn}
                  onFacebook={handleFacebookSignIn}
                  disabled={loading}
                />
              </>
            )}

            {/* Step 2a: Login (existing user) */}
            {step === "login" && (
              <>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Heslo</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        minLength={6}
                        autoComplete="current-password"
                        autoFocus
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="rememberMe"
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked === true)}
                        />
                        <label htmlFor="rememberMe" className="text-xs text-muted-foreground cursor-pointer">
                          Zapamatovat si mě
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!email) {
                            toast.error("Zadejte prosím email");
                            return;
                          }
                          try {
                            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                              redirectTo: `${window.location.origin}/reset-password`,
                            });
                            if (error) throw error;
                            changeStep("password-reset-sent");
                          } catch (error: any) {
                            toast.error(error.message || "Nepodařilo se odeslat email");
                          }
                        }}
                        className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors"
                      >
                        Zapomněli jste heslo?
                      </button>
                    </div>
                  </div>

                  {showResendOption && (
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      <p className="text-sm text-muted-foreground">Neobdrželi jste potvrzovací email?</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={handleResendConfirmation}
                        disabled={resendingEmail}
                      >
                        {resendingEmail ? "Odesílám..." : "Znovu odeslat potvrzovací email"}
                      </Button>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Načítání..." : "Přihlásit se"}
                  </Button>
                </form>

                <SocialButtons
                  onGoogle={handleGoogleSignIn}
                  onFacebook={handleFacebookSignIn}
                  disabled={loading}
                />
              </>
            )}

            {/* Step 2b-1: User type selection (new user) */}
            {step === "register-type" && (
              <>
                <div className="space-y-3">
                  <button
                    type="button"
                    className="w-full flex items-center gap-4 p-5 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                    onClick={() => {
                      setUserType('customer');
                      changeStep("register");
                    }}
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-base">Zákazník</p>
                      <p className="text-sm text-muted-foreground">Hledám řemeslníka pro svůj projekt</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-4 p-5 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                    onClick={() => {
                      setUserType('worker');
                      changeStep("register");
                    }}
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Wrench className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-base">Pracovník</p>
                      <p className="text-sm text-muted-foreground">Nabízím své řemeslnické služby</p>
                    </div>
                  </button>
                </div>

              </>
            )}

            {/* Step 2b-2: Registration form (new user) */}
            {step === "register" && (
              <>
                <form onSubmit={session ? handleOAuthRegister : handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Celé jméno</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="name"
                      autoFocus
                    />
                  </div>

                  {!session && (
                    <div className="space-y-2">
                      <Label htmlFor="regPassword">Heslo</Label>
                      <div className="relative">
                        <Input
                          id="regPassword"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={loading}
                          minLength={6}
                          autoComplete="new-password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <PasswordStrengthMeter password={password} />
                    </div>
                  )}

                  <div className="space-y-4 py-2">
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="terms" 
                        checked={termsAccepted} 
                        onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                        className="mt-1"
                      />
                      <Label htmlFor="terms" className="text-xs leading-relaxed font-normal text-muted-foreground cursor-pointer">
                        Souhlasím s <a href="/podminky" target="_blank" className="text-primary hover:underline">obchodními podmínkami</a> a <a href="/ochrana-udaju" target="_blank" className="text-primary hover:underline">zásadami ochrany osobních údajů</a>.
                      </Label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="marketing" 
                        checked={marketingAccepted} 
                        onCheckedChange={(checked) => setMarketingAccepted(checked === true)}
                        className="mt-1"
                      />
                      <Label htmlFor="marketing" className="text-xs leading-relaxed font-normal text-muted-foreground cursor-pointer">
                        Chci dostávat novinky a akční nabídky e-mailem.
                      </Label>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading || !termsAccepted}>
                    {loading ? "Načítání..." : (session ? "Dokončit nastavení" : "Registrovat se")}
                  </Button>
                </form>

                {!session && (
                  <SocialButtons
                    onGoogle={handleGoogleSignIn}
                    onFacebook={handleFacebookSignIn}
                    disabled={loading}
                  />
                )}
              </>
            )}
            {/* Email verification step */}
            {step === "email-verification" && (
              <div className="flex flex-col items-center text-center space-y-6 py-8 px-2 animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 rounded-full bg-[#a6d16f]/20 flex items-center justify-center shadow-lg shadow-[#a6d16f]/10">
                  <Mail className="h-10 w-10 text-[#213319]" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-foreground">Zkontrolujte si email</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
                    Na adresu <span className="font-bold text-foreground">{verificationEmail}</span> jsme odeslali potvrzovací odkaz.
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    Pokud email nevidíte, zkontrolujte prosím složku se spamem.
                  </p>
                </div>
                <div className="pt-4 w-full">
                   <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-border hover:bg-muted flex items-center justify-center gap-2"
                    onClick={handleResendConfirmation}
                    disabled={resendingEmail}
                  >
                    <RefreshCw className={`h-4 w-4 ${resendingEmail ? 'animate-spin' : ''}`} />
                    {resendingEmail ? "Odesílám..." : "Znovu odeslat email"}
                  </Button>
                </div>
              </div>
            )}

            {/* Password reset confirmation step */}
            {step === "password-reset-sent" && (
              <div className="flex flex-col items-center text-center space-y-8 py-10 px-4 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 rounded-full bg-[#a6d16f]/20 flex items-center justify-center shadow-2xl shadow-[#a6d16f]/5">
                  <Mail className="h-12 w-12 text-[#a6d16f]" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-white tracking-tight">Odesláno!</h3>
                  <div className="space-y-2">
                    <p className="text-base text-gray-300 leading-relaxed">
                      Email pro obnovu hesla byl odeslán na adresu:
                    </p>
                    <p className="text-lg font-semibold text-[#a6d16f]">{email}</p>
                  </div>
                  <p className="text-sm text-gray-400 italic">
                    Zkontrolujte si prosím doručenou poštu i složku se spamem.
                  </p>
                </div>
                <div className="pt-4 w-full">
                   <Button
                    type="button"
                    className="w-full h-14 bg-[#a6d16f] hover:bg-[#95bc64] text-[#1a1f1a] font-bold text-lg rounded-full shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                    onClick={() => changeStep("login")}
                  >
                    Zpět na přihlášení
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AuthDialog;
