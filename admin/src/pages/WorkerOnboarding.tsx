import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronRight, ChevronLeft, Loader2, Phone, CheckCircle2, MapPin, Lock, Info, Users, Check } from "lucide-react";
import * as Icons from "lucide-react";
import { geocodeAddress } from "@/lib/geocode-address";
import { AddressAutocompleteInput } from "@/components/AddressAutocompleteInput";
import { cn } from "@/lib/utils";
import zrobeeLogo from "@/assets/zrobee-logo.svg";

const WorkerOnboarding = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [returnPath] = useState(() => (location.state as any)?.from || '/');
  const [sniperJobId] = useState(() => localStorage.getItem("sniperJobId"));
  const [sniperJob, setSniperJob] = useState<{ subcategoryName: string; city: string; customerName: string; photoUrl: string | null; categoryId: string | null } | null>(null);

  // Fetch sniper job details if we have a sniperJobId
  useEffect(() => {
    if (!sniperJobId) return;
    const fetchJob = async () => {
      const { data } = await supabase
        .from('jobs')
        .select('city, photos, category_id, service_subcategories(name), profiles!jobs_customer_id_fkey(full_name)')
        .eq('id', sniperJobId)
        .single();
      if (data) {
        const jobData = data as any;
        const categoryId = jobData.category_id || null;
        setSniperJob({
          subcategoryName: jobData.service_subcategories?.name || 'Zakázka',
          city: jobData.city || '',
          customerName: jobData.profiles?.full_name?.split(' ')[0] || 'Zákazník',
          photoUrl: jobData.photos?.[0] || null,
          categoryId,
        });
        // Auto-preselect the sniper job's category
        if (categoryId) {
          setFormData(prev => {
            if (prev.selectedCategories.includes(categoryId)) return prev;
            return { ...prev, selectedCategories: [...prev.selectedCategories, categoryId] };
          });
        }
      }
    };
    fetchJob();
  }, [sniperJobId]);
  const [step, setStep] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [showVerifyPhoneDialog, setShowVerifyPhoneDialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [sendingVerification, setSendingVerification] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [formData, setFormData] = useState({
    selectedCategories: [] as string[],
    selectedSubcategories: [] as string[],
    fullAddress: "",
    city: "",
    latitude: null as number | null,
    longitude: null as number | null,
    streetName: "",
    streetNumber: "",
    postalCode: "",
    fullName: "",
    phone: "",
    companyType: "" as "self_employed" | "company" | "",
    businessName: "",
    ico: "",
    dic: "",
    email: "",
    password: "",
    termsAccepted: false,
    marketingConsent: false
  });
  const [showTermsError, setShowTermsError] = useState(false);

  // Keep step in a ref (used in auth callback without stale closures)
  const stepRef = useRef(step);
  const isPopRef = useRef(false);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  // Make the phone/browser back button go back exactly one onboarding step
  useEffect(() => {
    // Ensure we have a state for this route
    window.history.replaceState(
      { ...(window.history.state || {}), onboardingStep: 1 },
      "",
      window.location.href
    );

    const onPopState = (e: PopStateEvent) => {
      const s = (e.state as any)?.onboardingStep;
      if (typeof s === "number") {
        isPopRef.current = true;
        setStep(s);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (isPopRef.current) {
      isPopRef.current = false;
      return;
    }

    const current = (window.history.state as any)?.onboardingStep;
    if (current === step) return;

    window.history.pushState(
      { ...(window.history.state || {}), onboardingStep: step },
      "",
      window.location.href
    );
  }, [step]);

  // Check authentication status
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);

      // If user exists, load existing data
      if (session?.user) {
        loadExistingData(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadExistingData(session.user.id);
        // If user just logged in at step 4, auto-submit
        // If user just logged in at step 5, auto-submit
        if (stepRef.current === 5) {
          handleSubmit(session.user);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadExistingData = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone, company_type, city, phone_verified')
      .eq('id', userId)
      .single();

    const { data: services } = await supabase
      .from('worker_services')
      .select('subcategory_id, service_subcategories(category_id)')
      .eq('worker_id', userId);

    // Check if worker profile is already complete - if so, redirect to dashboard
    if (profile?.phone && profile?.company_type && services && services.length > 0) {
      console.log('Worker profile already complete, redirecting');
      toast.success('Váš pracovní účet je již nastaven');
      if (sniperJobId) {
        localStorage.removeItem("sniperJobId");
        navigate(`/remeslnik/zakazka/${sniperJobId}`);
      } else {
        navigate('/remeslnik/hledej');
      }
      return;
    }

    if (profile) {
      setFormData(prev => ({
        ...prev,
        fullName: profile.full_name || "",
        phone: profile.phone || "",
        companyType: (profile.company_type as "self_employed" | "company") || "",
        city: profile.city || ""
      }));
      setPhoneVerified(profile.phone_verified || false);
    }

    if (services && services.length > 0) {
      const categoryIds = [...new Set(services.map((s: any) => s.service_subcategories.category_id))];
      const subcategoryIds = services.map((s: any) => s.subcategory_id);
      
      setFormData(prev => ({
        ...prev,
        selectedCategories: categoryIds,
        selectedSubcategories: subcategoryIds
      }));
    }
  };

  // Fetch all categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['service-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch subcategories for selected categories
  const { data: subcategories = [], isLoading: subcategoriesLoading } = useQuery({
    queryKey: ['service-subcategories', formData.selectedCategories],
    queryFn: async () => {
      if (formData.selectedCategories.length === 0) return [];
      
      const { data, error } = await supabase
        .from('service_subcategories')
        .select('*')
        .in('category_id', formData.selectedCategories)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: formData.selectedCategories.length > 0
  });

  const getIcon = (iconName: string) => {
    const Icon = Icons[iconName as keyof typeof Icons] as any;
    return Icon || Icons.Wrench;
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedCategories.includes(categoryId);
      let newCategories;
      
      if (isSelected) {
        // Remove category and its subcategories
        newCategories = prev.selectedCategories.filter(id => id !== categoryId);
        const newSubcategories = prev.selectedSubcategories.filter(subId => {
          const subcategory = subcategories.find(s => s.id === subId);
          return subcategory?.category_id !== categoryId;
        });
        
        return {
          ...prev,
          selectedCategories: newCategories,
          selectedSubcategories: newSubcategories
        };
      } else {
        // Check if already have 4 categories selected
        if (prev.selectedCategories.length >= 4) {
          toast.error("Můžete vybrat maximálně 4 kategorie prací");
          return prev;
        }
        newCategories = [...prev.selectedCategories, categoryId];
        return {
          ...prev,
          selectedCategories: newCategories
        };
      }
    });
  };

  const handleSubcategoryToggle = (subcategoryId: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedSubcategories.includes(subcategoryId);
      
      if (isSelected) {
        return {
          ...prev,
          selectedSubcategories: prev.selectedSubcategories.filter(id => id !== subcategoryId)
        };
      } else {
        return {
          ...prev,
          selectedSubcategories: [...prev.selectedSubcategories, subcategoryId]
        };
      }
    });
  };

  const handleSendVerification = async () => {
    if (!formData.phone) {
      toast.error("Zadejte telefonní číslo");
      return;
    }
    
    setSendingVerification(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { error } = await supabase.functions.invoke('send-phone-verification', {
          body: { phone: formData.phone, userId: session.user.id }
        });

        if (error) throw error;
        setShowVerifyPhoneDialog(true);
        toast.success("Ověřovací kód byl odeslán");
      } else {
        toast.info("Ověření telefonu proběhne po vytvoření účtu");
      }
    } catch (error: any) {
      console.error('Error sending verification:', error);
      toast.error("Nepodařilo se odeslat ověřovací kód");
    } finally {
      setSendingVerification(false);
    }
  };

  const handleVerifyCode = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Nejste přihlášeni");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('verify-phone-code', {
        body: { code: verificationCode }
      });

      if (error) throw error;

      if (data.success) {
        setPhoneVerified(true);
        setShowVerifyPhoneDialog(false);
        setVerificationCode('');
        toast.success("Telefon byl úspěšně ověřen");
      } else {
        toast.error(data.error || "Neplatný kód");
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast.error("Nepodařilo se ověřit kód");
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check terms acceptance for registration
    if (!isLogin && !formData.termsAccepted) {
      setShowTermsError(true);
      return;
    }
    
    setAuthLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        toast.success("Úspěšně přihlášeno!");
      } else {
        const termsAcceptedAt = new Date().toISOString();
        const marketingConsentAt = formData.marketingConsent ? new Date().toISOString() : null;
        
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/registrace-remeslnika`,
            data: {
              full_name: formData.fullName,
              user_type: 'worker',
              terms_accepted_at: termsAcceptedAt,
              terms_version: "2025-01-01",
            },
          },
        });
        
        if (error) {
          if (error.message.includes("User already registered")) {
            toast.error("Tento email je již zaregistrován. Zkuste se přihlásit.");
            setIsLogin(true);
            return;
          }
          throw error;
        }

        // Update profile with terms, email preferences, and marketing consent
        if (data.user) {
          await supabase
            .from('profiles')
            .update({ 
              terms_accepted_at: termsAcceptedAt,
              terms_version: "2025-01-01",
              // Enable operational email notifications (from Checkbox A)
              email_notifications: true,
              email_new_jobs: true,
              // Marketing consent (from Checkbox B)
              marketing_notifications: formData.marketingConsent,
              marketing_consent_at: marketingConsentAt,
            })
            .eq('id', data.user.id);
        }

        if (data.user && !data.session) {
          toast.info("Zkontrolujte prosím svůj email pro potvrzení účtu.");
        } else if (data.user) {
          toast.success("Účet úspěšně vytvořen!");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Něco se pokazilo");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/registrace-remeslnika`,
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


  const handleNext = async () => {
    if (step === 1) {
      if (formData.selectedCategories.length === 0) {
        toast.error("Vyberte alespoň jednu kategorii práce");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Check if at least one subtype is selected from each category
      const categoriesWithoutSubtypes = formData.selectedCategories.filter(categoryId => {
        const hasSubtype = formData.selectedSubcategories.some(subId => {
          const subcategory = subcategories.find(s => s.id === subId);
          return subcategory?.category_id === categoryId;
        });
        return !hasSubtype;
      });
      
      if (categoriesWithoutSubtypes.length > 0) {
        toast.error("Vyberte alespoň jeden typ práce z každé kategorie");
        return;
      }
      
      setStep(3);
    } else if (step === 3) {
      if (!formData.fullName || !formData.phone || !formData.companyType) {
        toast.error("Vyplňte všechny povinné údaje");
        return;
      }
      setStep(4);
    } else if (step === 4) {
      const cityVal = (formData as any).cityField || formData.city;
      if (!cityVal) {
        toast.error("Vyplňte město");
        return;
      }
      if (!formData.streetNumber?.trim()) {
        toast.error("Číslo popisné je povinné");
        return;
      }
      // Geocode the address before proceeding
      const coords = await geocodeAddress(
        formData.streetName,
        formData.streetNumber,
        cityVal,
        formData.postalCode
      );
      const fullAddr = `${formData.streetName} ${formData.streetNumber}, ${formData.postalCode} ${cityVal}`.trim();
      setFormData(prev => ({
        ...prev,
        fullAddress: fullAddr,
        city: cityVal,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      }));
      // If user is already logged in, skip step 5 and submit
      if (user) {
        await handleSubmit();
      } else {
        setStep(5);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigate(returnPath);
    }
  };

  const handleSubmit = async (currentUser?: any) => {
    if (isSubmitting) return;
    
    const submitUser = currentUser || user;
    if (!submitUser) {
      toast.error("Prosím přihlaste se nebo vytvořte účet");
      return;
    }
    
    try {
      setIsSubmitting(true);

      // Update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
          company_type: formData.companyType || null,
          city: formData.city,
          full_address: formData.streetName && formData.streetNumber && formData.city
            ? `${formData.streetName} ${formData.streetNumber}, ${formData.postalCode} ${formData.city}`.trim()
            : formData.fullAddress,
          latitude: formData.latitude,
          longitude: formData.longitude,
          street_name: formData.streetName || null,
          street_number: formData.streetNumber || null,
          postal_code: formData.postalCode || null,
          user_type: 'worker'
        })
        .eq('id', submitUser.id);

      if (profileError) throw profileError;

      // Delete existing services
      await supabase
        .from('worker_services')
        .delete()
        .eq('worker_id', submitUser.id);

      // Save new selected services
      const servicesToInsert = formData.selectedSubcategories.map(subcategoryId => ({
        worker_id: submitUser.id,
        subcategory_id: subcategoryId
      }));

      const { error: servicesError } = await supabase
        .from('worker_services')
        .insert(servicesToInsert);

      if (servicesError) throw servicesError;

      // Create business if businessName or IČO is provided
      if (formData.businessName || formData.ico) {
        const { error: bizError } = await supabase.rpc('create_business', {
          p_name: formData.businessName || formData.fullName,
          p_ico: formData.ico || null,
          p_dic: formData.dic || null,
          p_company_type: formData.companyType || 'self_employed'
        });
        if (bizError) {
          console.error('Error creating business:', bizError);
          // Non-fatal — profile is already saved
        }
      }

      toast.success("Profil pracovníka byl úspěšně vytvořen!");
      if (sniperJobId) {
        localStorage.removeItem("sniperJobId");
        navigate(`/remeslnik/zakazka/${sniperJobId}`);
      } else {
        navigate('/remeslnik/hledej');
      }
    } catch (error: any) {
      console.error('Error creating worker profile:', error);
      toast.error("Chyba při vytváření profilu: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    if (step === 1) {
      return (
        <div className="space-y-4">
          <h3 className="text-sm font-medium tracking-tight text-foreground">Co umíte nejlépe?</h3>
          <p className="text-xs text-muted-foreground -mt-2">
            Vyberte maximálně 4 hlavní kategorie prací ({formData.selectedCategories.length}/4)
          </p>
          <p className="text-xs text-muted-foreground flex items-start gap-1.5 -mt-1">
            <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-primary" />
            Tip: Čím více kategorií, tím více zakázek uvidíte.
          </p>

          {categoriesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {categories.map((category) => {
                const Icon = getIcon(category.icon);
                const isSelected = formData.selectedCategories.includes(category.id);
                
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryToggle(category.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-full transition-all whitespace-nowrap overflow-hidden ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground hover:bg-primary-hover' 
                        : 'bg-muted text-foreground hover:bg-primary hover:text-primary-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs font-medium truncate">{category.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-4">
          <h3 className="text-sm font-medium tracking-tight text-foreground">Upřesněte své dovednosti</h3>
          <p className="text-xs text-muted-foreground -mt-2">
            Vyberte alespoň jeden typ práce z každé kategorie (vybráno: {formData.selectedSubcategories.length})
          </p>
          <p className="text-xs text-muted-foreground flex items-start gap-1.5 -mt-1">
            <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-primary" />
            Zákazníci vás najdou právě díky těmto detailům.
          </p>

          <div>
            {subcategoriesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : subcategories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nejprve vyberte kategorie v předchozím kroku
              </div>
            ) : (
              <div className="space-y-4 pb-4">
                {categories
                  .filter(cat => formData.selectedCategories.includes(cat.id))
                  .map(category => {
                    const categorySubcategories = subcategories.filter(
                      sub => sub.category_id === category.id
                    );
                    
                    if (categorySubcategories.length === 0) return null;
                    
                    return (
                      <div key={category.id} className="space-y-2">
                        <h4 className="font-semibold text-foreground text-sm">{category.name}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {categorySubcategories.map(subcategory => (
                            <div
                              key={subcategory.id}
                              onClick={() => handleSubcategoryToggle(subcategory.id)}
                              className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer active:bg-accent transition-all select-none ${
                                formData.selectedSubcategories.includes(subcategory.id)
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:bg-accent/50'
                              }`}
                            >
                              <Checkbox
                                id={subcategory.id}
                                checked={formData.selectedSubcategories.includes(subcategory.id)}
                                onCheckedChange={() => handleSubcategoryToggle(subcategory.id)}
                                className="pointer-events-none"
                              />
                              <label
                                className="text-xs font-medium leading-none cursor-pointer flex-1 text-foreground pointer-events-none"
                              >
                                {subcategory.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-4">
          <h3 className="text-sm font-medium tracking-tight text-foreground">Představte se zákazníkům</h3>
          <p className="text-xs text-muted-foreground -mt-2">
            Tyto údaje budou zobrazeny zákazníkům
          </p>
          <p className="text-xs text-muted-foreground flex items-start gap-1.5 -mt-1">
            <Lock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            Vaše telefonní číslo uvidíte jen vy a zákazník, který si vás vybere.
          </p>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm text-foreground">Jméno a příjmení *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Jan Novák"
                className="bg-input-fill text-input-fill-foreground h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm text-foreground">Telefonní číslo *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, phone: e.target.value }));
                      setPhoneVerified(false);
                    }}
                    placeholder="+420 123 456 789"
                    className="bg-input-fill text-input-fill-foreground h-10 pl-10"
                  />
                </div>
                {user && (
                  <Button
                    type="button"
                    variant={phoneVerified ? "outline" : "default"}
                    size="sm"
                    className="h-10 px-3 whitespace-nowrap"
                    onClick={handleSendVerification}
                    disabled={sendingVerification || phoneVerified || !formData.phone}
                  >
                    {sendingVerification ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : phoneVerified ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-1.5 text-primary" />
                        <span className="text-xs">Ověřeno</span>
                      </>
                    ) : (
                      <span className="text-xs">Ověřit</span>
                    )}
                  </Button>
                )}
              </div>
              {!user && formData.phone && (
                <p className="text-xs text-muted-foreground">
                  Ověření telefonu proběhne po vytvoření účtu
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-foreground">Typ podnikání *</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant={formData.companyType === 'self_employed' ? 'default' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, companyType: 'self_employed', businessName: prev.businessName || prev.fullName }))}
                  className="h-10"
                >
                  OSVČ
                </Button>
                <Button
                  type="button"
                  variant={formData.companyType === 'company' ? 'default' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, companyType: 'company' }))}
                  className="h-10"
                >
                  Firma
                </Button>
              </div>
            </div>

            {formData.companyType && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-sm text-foreground">Název firmy / Jméno</Label>
                  <Input
                    value={formData.businessName}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                    placeholder={formData.companyType === 'self_employed' ? formData.fullName : 'Název firmy s.r.o.'}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-foreground">IČO</Label>
                  <Input
                    value={formData.ico}
                    onChange={(e) => setFormData(prev => ({ ...prev, ico: e.target.value }))}
                    placeholder="12345678"
                    maxLength={8}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-foreground">DIČ</Label>
                  <Input
                    value={formData.dic}
                    onChange={(e) => setFormData(prev => ({ ...prev, dic: e.target.value }))}
                    placeholder="CZ12345678"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (step === 4) {
      return (
        <div className="space-y-4">
          <h3 className="text-sm font-medium tracking-tight text-foreground">Kde chcete pracovat?</h3>
          <p className="text-xs text-muted-foreground -mt-2">
            Adresu používáme k nalezení zakázek ve Vašem okolí
          </p>
          <p className="text-xs text-muted-foreground flex items-start gap-1.5 -mt-1">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            Zobrazíme vám zakázky ve vašem okolí. Přesnou adresu zákazníci neuvidí.
          </p>
          
          <div className="space-y-4">

            <AddressAutocompleteInput
              onSelect={(result) => {
                setFormData(prev => ({
                  ...prev,
                  streetName: result.streetName,
                  streetNumber: result.streetNumber,
                  postalCode: result.postalCode,
                  city: result.city,
                  cityField: result.city,
                  latitude: result.lat,
                  longitude: result.lng,
                  fullAddress: `${result.streetName} ${result.streetNumber}, ${result.postalCode} ${result.city}`.trim(),
                }));
              }}
              placeholder="Začněte psát adresu..."
            />

            {/* Individual address fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-muted-foreground">Ulice</Label>
                <Input
                  value={(formData as any).streetName || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, streetName: e.target.value }))}
                  placeholder="Název ulice"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Číslo popisné</Label>
                <Input
                  value={(formData as any).streetNumber || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, streetNumber: e.target.value }))}
                  placeholder="123"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">PSČ</Label>
                <Input
                  value={(formData as any).postalCode || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                  placeholder="110 00"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-muted-foreground">Město</Label>
                <Input
                  value={(formData as any).cityField || formData.city || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, cityField: e.target.value, city: e.target.value }))}
                  placeholder="Praha"
                />
              </div>
            </div>
            
          </div>
        </div>
      );
    }

    if (step === 5) {
      return (
        <div className="space-y-4">
          <h3 className="text-sm font-medium tracking-tight text-foreground">
              {isLogin ? "Přihlášení" : "Poslední krok — a jdete na to!"}
          </h3>
          <p className="text-xs text-muted-foreground -mt-2">
              {isLogin 
                ? "Přihlaste se ke svému existujícímu účtu" 
                : "Vytvořte si účet pro dokončení registrace"}
          </p>

          {/* OAuth Buttons */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full h-10 bg-input-fill text-input-fill-foreground"
              onClick={handleGoogleSignIn}
              disabled={authLoading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Pokračovat s Google
            </Button>

          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Nebo
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
                disabled={authLoading}
                className="bg-input-fill text-input-fill-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Heslo</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
                disabled={authLoading}
                minLength={6}
                className="bg-input-fill text-input-fill-foreground"
              />
            </div>

            {/* Legal Checkboxes - Only for Registration */}
            {!isLogin && (
              <div className="space-y-3">
                {/* Checkbox A - Mandatory Terms & Service Notifications */}
                <div 
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                    showTermsError && !formData.termsAccepted 
                      ? "border-destructive bg-destructive/5" 
                      : formData.termsAccepted
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-muted/30"
                  )}
                >
                  <Checkbox
                    id="termsAccepted"
                    checked={formData.termsAccepted}
                    onCheckedChange={(checked) => {
                      setFormData(prev => ({ ...prev, termsAccepted: checked === true }));
                      if (checked) setShowTermsError(false);
                    }}
                    disabled={authLoading}
                    className="mt-0.5"
                  />
                  <Label 
                    htmlFor="termsAccepted" 
                    className="text-xs leading-relaxed cursor-pointer font-normal text-foreground"
                  >
                    Souhlasím s{" "}
                    <a href="/podminky" target="_blank" className="text-primary hover:underline font-medium">
                      Obchodními podmínkami
                    </a>{" "}
                    a beru na vědomí{" "}
                    <a href="/ochrana-udaju" target="_blank" className="text-primary hover:underline font-medium">
                      Zásady ochrany osobních údajů
                    </a>
                    . Rozumím, že součástí služby je zasílání notifikací o nových poptávkách na můj email.
                  </Label>
                </div>
                {showTermsError && !formData.termsAccepted && (
                  <p className="text-xs text-destructive flex items-center gap-1 px-1">
                    <Icons.AlertCircle className="h-3 w-3" />
                    Pro pokračování musíte souhlasit s podmínkami.
                  </p>
                )}

                {/* Checkbox B - Optional Marketing Consent */}
                <div 
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                    formData.marketingConsent
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-muted/30"
                  )}
                >
                  <Checkbox
                    id="marketingConsent"
                    checked={formData.marketingConsent}
                    onCheckedChange={(checked) => {
                      setFormData(prev => ({ ...prev, marketingConsent: checked === true }));
                    }}
                    disabled={authLoading}
                    className="mt-0.5"
                  />
                  <Label 
                    htmlFor="marketingConsent" 
                    className="text-xs leading-relaxed cursor-pointer font-normal text-muted-foreground"
                  >
                    <Icons.Gift className="h-3.5 w-3.5 inline-block mr-1 text-primary" />
                    Chci dostávat tipy pro získání více zakázek a exkluzivní slevy na kredity.
                  </Label>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={authLoading || (!isLogin && !formData.termsAccepted)}
            >
              {authLoading ? "Načítání..." : isLogin ? "Přihlásit se" : "Vytvořit účet a dokončit"}
            </Button>
            
            {/* Trust micro-copy */}
            {!isLogin && (
              <p className="text-[11px] text-muted-foreground text-center">
                Žádný spam. Frekvenci emailů si můžete kdykoliv upravit v nastavení profilu.
              </p>
            )}
          </form>

          <div className="text-center text-sm">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-muted-foreground hover:text-foreground hover:underline"
              disabled={authLoading}
            >
              {isLogin ? "Nemáte účet? Vytvořit nový" : "Již máte účet? Přihlásit se"}
            </button>
          </div>
        </div>
      );
    }
  };

  const isStepValid = () => {
    if (step === 1) return formData.selectedCategories.length > 0;
    if (step === 2) {
      // Check if at least one subtype is selected from each category
      return formData.selectedCategories.every(categoryId => {
        return formData.selectedSubcategories.some(subId => {
          const subcategory = subcategories.find(s => s.id === subId);
          return subcategory?.category_id === categoryId;
        });
      });
    }
    if (step === 3) return formData.fullName && formData.phone && formData.companyType;
    if (step === 4) return formData.fullAddress && formData.city && formData.latitude;
    if (step === 5) return false; // Auth step uses its own form submission
    return false;
  };

  const totalSteps = user ? 4 : 5;
  const progress = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Dashboard-like sticky header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border/40 w-full h-[73px] flex items-center justify-between px-4 sm:px-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end bg-[hsl(var(--list-item-header))] py-2 px-5 rounded-full">
            <img src={zrobeeLogo} alt="zrobee" className="h-5" />
            <span className="text-[8px] font-bold tracking-wider text-[hsl(var(--sidebar-active-text))] leading-none mt-0.5">PRACOVNÍK</span>
          </div>
        </div>
        {/* Sniper job preview in header */}
        {sniperJob && (
          <div className="flex items-center gap-2.5 max-w-[220px] sm:max-w-xs">
            {sniperJob.photoUrl ? (
              <img src={sniperJob.photoUrl} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-foreground truncate">{sniperJob.subcategoryName}</p>
              <p className="text-[10px] text-muted-foreground truncate">{sniperJob.city}</p>
            </div>
          </div>
        )}
      </header>

      <div className="flex-1 py-4 px-3 md:px-4 pb-32 flex justify-center">
      <div className="max-w-2xl w-full">

            {/* iOS-style back button at top */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="flex items-center gap-1 text-foreground mb-3 -ml-2 hover:opacity-80 transition-opacity rounded-full px-3"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Zpět
            </Button>

            <Card className="border-0 shadow-none bg-transparent md:bg-card md:border md:shadow-sm">
              <div className="pb-3 pt-2 px-0 md:px-6">
                {/* Sniper job mini-card */}
                {sniperJob && (
                  <div className="mb-4 bg-background/60 backdrop-blur-sm border border-primary/15 rounded-xl px-4 py-3 flex items-center gap-3 animate-fade-in">
                    {sniperJob.photoUrl ? (
                      <img src={sniperJob.photoUrl} alt="" className="h-10 w-10 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">{sniperJob.subcategoryName}</p>
                      <p className="text-[10px] text-muted-foreground">{sniperJob.city} · {sniperJob.customerName}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full shrink-0 whitespace-nowrap">
                      Čeká na vás
                    </span>
                  </div>
                )}

                {/* Social proof or sniper motivational copy */}
                <div className="flex items-center gap-1.5 mb-3">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {sniperJob 
                      ? `Ještě ${totalSteps - step + 1} ${totalSteps - step + 1 === 1 ? 'krok' : 'kroky'} a můžete podat nabídku`
                      : 'Už 850+ řemeslníků na platformě · Průměrně 3 zakázky/týden'
                    }
                  </span>
                </div>

                {/* Segmented stepper */}
                <div className="flex items-center gap-1 mb-1">
                  {Array.from({ length: totalSteps }, (_, i) => {
                    const stepNum = i + 1;
                    const isDone = stepNum < step;
                    const isCurrent = stepNum === step;
                    return (
                      <div key={stepNum} className="flex items-center flex-1 gap-1">
                        <div className={cn(
                          "flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium transition-all flex-shrink-0",
                          isDone && "bg-primary text-primary-foreground",
                          isCurrent && "ring-2 ring-primary bg-background text-foreground",
                          !isDone && !isCurrent && "bg-muted text-muted-foreground"
                        )}>
                          {isDone ? <Check className="h-3.5 w-3.5" /> : stepNum}
                        </div>
                        {stepNum < totalSteps && (
                          <div className={cn(
                            "flex-1 h-0.5 rounded-full transition-all",
                            isDone ? "bg-primary" : "bg-muted"
                          )} />
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase mt-2">
                  {sniperJob ? `Krok ${step} z ${totalSteps} — ${step === totalSteps ? 'Podat nabídku' : ['Obory', 'Speciality', 'O vás', 'Lokalita', 'Účet'][step - 1] || 'Registrace'}` : `Krok ${step} z ${totalSteps}`}
                </p>
              </div>
              <CardContent className="pb-4 px-0 md:px-6">
                <div key={step} className="animate-fade-in">
                  {renderStep()}
                </div>

                {step !== 5 && (
                  <div className="mt-6 space-y-2">
                    <Button onClick={handleNext} disabled={!isStepValid() || isSubmitting} className="w-full h-10 rounded-full">
                      {isSubmitting ? "Ukládání..." : step === 4 && user ? "Dokončit" : "Další"}
                      {!isSubmitting && <ChevronRight className="h-4 w-4 ml-2" />}
                    </Button>
                    {(step === 3 || step === 4) && (
                      <button
                        type="button"
                        onClick={() => navigate(returnPath)}
                        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                      >
                        Dokončit později
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

        {/* Phone Verification Dialog */}
        <Dialog open={showVerifyPhoneDialog} onOpenChange={setShowVerifyPhoneDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ověření telefonního čísla</DialogTitle>
              <DialogDescription>
                Zadejte 6místný kód, který jsme odeslali na vaše telefonní číslo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Zadejte kód"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
              <Button onClick={handleVerifyCode} className="w-full h-10">
                Ověřit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      </div>
    </div>
  );
};

export default WorkerOnboarding;
