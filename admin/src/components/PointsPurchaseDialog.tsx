import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Coins, Zap, Star, Crown, Sparkles, Check, HelpCircle, AlertCircle, ShieldCheck, ArrowLeft, Building2, Pencil, ChevronDown, ChevronUp, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { useIsNativeApp } from "@/hooks/useIsNativeApp";

const POINT_PACKAGES = [
  { 
    points: 5, 
    price: 59, 
    label: "Startovací", 
    description: "Ideální na vyzkoušení",
    icon: Zap,
    perPoint: 11.8,
    features: ["5 nabídek na zakázky"]
  },
  { 
    points: 15, 
    price: 149, 
    label: "Základní", 
    description: "Pro příležitostné řemeslníky",
    icon: Coins,
    perPoint: 9.9,
    features: ["15 nabídek na zakázky", "Úspora 10%"]
  },
  { 
    points: 35, 
    price: 299, 
    label: "Profesionální", 
    description: "Nejoblíbenější volba",
    icon: Star,
    perPoint: 8.5,
    popular: true,
    features: ["35 nabídek na zakázky", "Úspora 20%"]
  },
  { 
    points: 75, 
    price: 549, 
    label: "Business", 
    description: "Pro aktivní profesionály",
    icon: Crown,
    perPoint: 7.3,
    features: ["75 nabídek na zakázky", "Úspora 30%"]
  },
  { 
    points: 150, 
    price: 999, 
    label: "Prémiový", 
    description: "Maximální výhody",
    icon: Sparkles,
    perPoint: 6.7,
    bestValue: true,
    features: ["150 nabídek na zakázky", "Úspora 40%"]
  },
];

const PRO_MEMBERSHIP = {
  priceMonthly: 299,
  priceYearly: 249,
  priceYearlyTotal: 2990,
  label: "PRO Členství",
  description: "Měsíční předplatné",
  features: [
    "20 kreditů každý měsíc",
    "Prioritní sloty 7-8 na zakázky",
    "PRO odznak u profilu",
    "Přednostní zobrazení nabídek"
  ]
};

interface BillingFormData {
  company_name: string;
  ico: string;
  dic: string;
  street: string;
  city: string;
  zip: string;
  country: string;
}

interface PointsPurchaseDialogProps {
  currentPoints: number;
  onPurchaseComplete: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const PointsPurchaseDialog = ({ 
  currentPoints, 
  onPurchaseComplete,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}: PointsPurchaseDialogProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = controlledOnOpenChange || setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<typeof POINT_PACKAGES[0] | null>(null);
  const [selectedProMembership, setSelectedProMembership] = useState(false);
  const [refundWaiverAccepted, setRefundWaiverAccepted] = useState(false);
  const [showWaiverError, setShowWaiverError] = useState(false);
  const [step, setStep] = useState<'select' | 'confirm'>('select');
  const [billingInterval, setBillingInterval] = useState<'yearly' | 'monthly'>('yearly');
  const isNativeApp = useIsNativeApp();
  const [isBillingExpanded, setIsBillingExpanded] = useState(false);
  const [billingForm, setBillingForm] = useState<BillingFormData>({
    company_name: "",
    ico: "",
    dic: "",
    street: "",
    city: "",
    zip: "",
    country: "Česká republika",
  });

  // Fetch existing billing profile
  const { data: billingProfile, isLoading: billingLoading } = useQuery({
    queryKey: ["billing-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("billing_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Fetch PRO status
  const { data: proStatus } = useQuery({
    queryKey: ["pro-status"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("is_pro, pro_expires_at")
        .eq("id", user.id)
        .single();

      if (error) return null;
      return data;
    },
    enabled: isOpen,
  });

  const isPro = proStatus?.is_pro && proStatus?.pro_expires_at && new Date(proStatus.pro_expires_at) > new Date();

  // Check if billing profile is complete (without IČO requirement)
  const isBillingComplete = billingProfile?.company_name && billingProfile?.street && billingProfile?.city && billingProfile?.zip;

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setRefundWaiverAccepted(false);
      setShowWaiverError(false);
      setSelectedPackage(null);
      setSelectedProMembership(false);
      setStep('select');
      setIsBillingExpanded(false);
    }
  }, [isOpen]);

  // Populate billing form from existing profile
  useEffect(() => {
    if (billingProfile) {
      setBillingForm({
        company_name: billingProfile.company_name || "",
        ico: billingProfile.ico || "",
        dic: billingProfile.dic || "",
        street: billingProfile.street || "",
        city: billingProfile.city || "",
        zip: billingProfile.zip || "",
        country: billingProfile.country || "Česká republika",
      });
    }
  }, [billingProfile]);

  const handlePackageSelect = (pkg: typeof POINT_PACKAGES[0]) => {
    setSelectedPackage(pkg);
    setSelectedProMembership(false);
    if (!isBillingComplete) {
      setIsBillingExpanded(true);
    }
    setStep('confirm');
  };

  const handleProSelect = () => {
    setSelectedPackage(null);
    setSelectedProMembership(true);
    if (!isBillingComplete) {
      setIsBillingExpanded(true);
    }
    setStep('confirm');
  };

  // Format helpers
  const formatIco = (value: string) => value.replace(/\D/g, "").slice(0, 8);
  const formatDic = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleaned.startsWith("CZ")) {
      return "CZ" + cleaned.slice(2).replace(/\D/g, "").slice(0, 10);
    }
    return cleaned.slice(0, 12);
  };
  const formatZip = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 5);
    if (digits.length > 3) {
      return digits.slice(0, 3) + " " + digits.slice(3);
    }
    return digits;
  };

  const isBillingFormValid = billingForm.company_name && billingForm.street && billingForm.city && billingForm.zip;

  const handleConfirmPurchase = async () => {
    if (!selectedPackage && !selectedProMembership) return;
    
    // Check billing info
    if (!isBillingFormValid) {
      setIsBillingExpanded(true);
      toast({
        title: "Vyplňte fakturační údaje",
        description: "Pro dokončení platby je nutné vyplnit fakturační údaje.",
        variant: "destructive",
      });
      return;
    }

    // Check refund waiver consent (only for credits, not for subscription)
    if (selectedPackage && !refundWaiverAccepted) {
      setShowWaiverError(true);
      return;
    }

    try {
      setLoading(true);
      
      // First: Save billing info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: billingError } = await supabase
        .from("billing_profiles")
        .upsert({
          user_id: user.id,
          ...billingForm,
        });

      if (billingError) throw billingError;
      
      // Show toast if billing was edited
      if (isBillingExpanded) {
        toast({
          title: "Údaje uloženy",
          description: "Fakturační údaje budou uloženy i pro příští nákupy.",
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["billing-profile"] });
      
      // Create checkout session based on selection
      const functionName = selectedProMembership ? 'create-pro-checkout' : 'create-points-checkout';
      const body = selectedPackage 
        ? { 
            points: selectedPackage.points,
            refundWaiverAcceptedAt: new Date().toISOString()
          }
        : {};

      const { data, error } = await supabase.functions.invoke(functionName, { body });

      if (error) throw error;

       if (data?.url) {
         // Stripe Checkout frequently fails to fully load inside the Lovable preview iframe.
         // Open it in a new tab/window to ensure it's top-level.
         const newTab = window.open(data.url, "_blank", "noopener,noreferrer");
         if (!newTab) {
           // Fallback if popup is blocked
           window.location.assign(data.url);
         }
       } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se vytvořit platbu",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('select');
    setSelectedPackage(null);
    setSelectedProMembership(false);
    setRefundWaiverAccepted(false);
    setShowWaiverError(false);
    setIsBillingExpanded(false);
  };

  const proDisplayPrice = billingInterval === 'yearly' ? PRO_MEMBERSHIP.priceYearly : PRO_MEMBERSHIP.priceMonthly;
  const currentPrice = selectedPackage?.price || (selectedProMembership ? proDisplayPrice : 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-full h-full max-w-full max-h-full m-0 p-0 rounded-none md:w-[520px] md:h-auto md:max-h-[85vh] md:m-4 md:rounded-2xl overflow-auto bg-white dark:bg-zinc-900">
        <div className="min-h-full md:min-h-0 flex flex-col p-4 md:p-5">
          
          {/* STEP 1: Package Selection */}
          {step === 'select' && (
            <>
              <DialogHeader className="pb-1">
                <DialogTitle className="text-lg font-bold">Zakoupit kredity</DialogTitle>
                <DialogDescription className="text-xs text-foreground">
                  Máte <span className="font-semibold text-foreground">{currentPoints} kreditů</span>. 
                  {!isPro && " Nebo získejte PRO členství."}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-2.5 py-3 flex-1 overflow-auto">
                {/* PRO Membership Option */}
                {!isPro && (
                  <div 
                    className={cn(
                      "relative rounded-lg p-4 min-h-[160px] transition-all cursor-pointer shadow-md hover:shadow-lg bg-white dark:bg-zinc-800 border border-border",
                      isNativeApp && "opacity-60 pointer-events-none"
                    )}
                    onClick={isNativeApp ? undefined : handleProSelect}
                  >
                    <div className="absolute -top-2 left-3 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      PRO ČLENSTVÍ
                    </div>
                    
                    <div className="flex items-start gap-3 pt-1">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 bg-primary text-primary-foreground">
                        <Crown className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                      <div>
                          <h3 className="font-bold text-sm text-foreground">{PRO_MEMBERSHIP.label}</h3>
                        </div>

                        {/* Price display */}
                        <div className="text-center mt-2">
                          <p className="text-2xl font-bold text-foreground">{proDisplayPrice} Kč<span className="text-xs font-normal text-foreground">/měs.</span></p>
                          <p className="text-xs text-foreground mt-0.5">
                            {billingInterval === 'yearly' 
                              ? `Fakturováno ročně ${PRO_MEMBERSHIP.priceYearlyTotal} Kč (2 měsíce zdarma)` 
                              : 'Platba každý měsíc'}
                          </p>
                        </div>
                        
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {PRO_MEMBERSHIP.features.map((feature, idx) => (
                            <span key={idx} className="inline-flex items-center gap-0.5 text-[11px] text-foreground">
                              <Check className="h-3 w-3" />
                              {feature}
                            </span>
                          ))}
                        </div>

                        {/* Segmented billing toggle — bottom, full width */}
                        <div className="bg-muted rounded-full p-1 flex w-full mt-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className={cn(
                              "flex-1 rounded-full py-1.5 text-xs font-bold transition-all text-center",
                              billingInterval === 'yearly'
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => setBillingInterval('yearly')}
                          >
                            Ročně
                            <span className="ml-1.5 inline-flex items-center bg-green-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                              −17%
                            </span>
                          </button>
                          <button
                            type="button"
                            className={cn(
                              "flex-1 rounded-full py-1.5 text-xs font-bold transition-all text-center",
                              billingInterval === 'monthly'
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => setBillingInterval('monthly')}
                          >
                            Měsíčně
                          </button>
                        </div>
                      </div>
                    </div>

                    {isNativeApp && (
                      <div className="mt-2 text-center">
                        <Button variant="outline" size="sm" className="h-7 text-[10px] w-full" disabled>
                          <Globe className="h-3 w-3 mr-1" />
                          Dostupné na webu
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Separator */}
                {!isPro && (
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] text-foreground/70">nebo jednorázově</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}

                {/* Credit Packages */}
                {POINT_PACKAGES.map((pkg) => {
                  const IconComponent = pkg.icon;
                  
                  return (
                    <div 
                      key={pkg.points}
                      className={cn(
                        "relative rounded-lg p-3 transition-all cursor-pointer shadow-md hover:shadow-lg bg-white dark:bg-zinc-800 border border-border",
                        isNativeApp && "opacity-60 pointer-events-none"
                      )}
                      onClick={isNativeApp ? undefined : () => handlePackageSelect(pkg)}
                    >
                      {/* Badges */}
                      {pkg.popular && (
                        <div className="absolute -top-2 left-3 bg-primary text-primary-foreground text-[9px] font-semibold px-2 py-0.5 rounded-full">
                          NEJOBLÍBENĚJŠÍ
                        </div>
                      )}
                      {pkg.bestValue && (
                        <div className="absolute -top-2 left-3 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          NEJLEPŠÍ HODNOTA
                        </div>
                      )}
                      
                      <div className={cn("flex items-start gap-2", (pkg.popular || pkg.bestValue) && "pt-1")}>
                        {/* Icon */}
                         <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          pkg.popular || pkg.bestValue
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted text-foreground"
                        }`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <h3 className="font-bold text-sm text-foreground">{pkg.label}</h3>
                              <p className="text-xs text-foreground">{pkg.description}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-base font-bold text-foreground">{pkg.price} Kč</p>
                              <p className="text-xs text-foreground">{pkg.perPoint.toFixed(1)} Kč/kr.</p>
                            </div>
                          </div>
                          
                          {/* Points highlight */}
                          <div className="mt-1 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-foreground">
                              <Coins className="h-3 w-3" />
                              {pkg.points} kreditů
                            </span>
                            
                            {/* Features */}
                            {pkg.features.slice(1).map((feature, idx) => (
                              <span key={idx} className="inline-flex items-center gap-0.5 text-[11px] text-foreground">
                                <Check className="h-2.5 w-2.5 text-primary" />
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isNativeApp && (
                  <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
                    <p className="text-[11px] text-muted-foreground">
                      <Globe className="h-3.5 w-3.5 inline-block mr-1" />
                      Nákupy a předplatné spravujte na <strong>zrobee.cz</strong>
                    </p>
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="pt-2 border-t border-border mt-auto space-y-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground h-8 text-xs"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/remeslnik/body-info');
                  }}
                >
                  <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
                  Jak fungují kredity?
                </Button>
                <p className="text-xs text-foreground/70 text-center">
                  Platba je bezpečná a šifrovaná.
                </p>
              </div>
            </>
          )}

          {/* STEP 2: Confirmation with Billing */}
          {step === 'confirm' && (selectedPackage || selectedProMembership) && (
            <>
              <DialogHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleBack}
                    disabled={loading}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <DialogTitle className="text-lg font-bold">Potvrzení objednávky</DialogTitle>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-auto space-y-3">
                {/* Selected Package/PRO Summary */}
                <div className={cn(
                  "rounded-lg border p-3",
                  selectedProMembership 
                    ? "border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5" 
                    : "border-border bg-white dark:bg-zinc-800"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      selectedProMembership 
                        ? "bg-primary text-primary-foreground"
                        : (selectedPackage?.popular || selectedPackage?.bestValue)
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-foreground"
                    )}>
                      {selectedProMembership ? (
                        <Crown className="h-5 w-5" />
                      ) : selectedPackage && (
                        <selectedPackage.icon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Vybrali jste:</p>
                      <h3 className="text-base font-bold text-foreground">
                        {selectedProMembership ? PRO_MEMBERSHIP.label : selectedPackage?.label}
                      </h3>
                      {selectedPackage && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-foreground">
                            <Coins className="h-3 w-3" />
                            {selectedPackage.points} kreditů
                          </span>
                        </div>
                      )}
                      {selectedProMembership && (
                        <p className="text-xs text-primary">Měsíční předplatné</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-foreground">{currentPrice} Kč</p>
                      <p className="text-[10px] text-muted-foreground">
                        {selectedProMembership ? "/měsíc vč. DPH" : "vč. DPH"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Billing Details Section */}
                <div className="rounded-lg border border-border">
                  <Collapsible open={isBillingExpanded} onOpenChange={setIsBillingExpanded}>
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-sm text-foreground">Fakturační údaje</h4>
                            {isBillingFormValid && !isBillingExpanded ? (
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {billingForm.company_name}
                                {billingForm.ico && ` (IČO: ${billingForm.ico})`}
                              </p>
                            ) : !isBillingFormValid && !isBillingExpanded ? (
                              <p className="text-[11px] text-destructive mt-0.5">
                                Vyplňte prosím fakturační údaje
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                            {isBillingExpanded ? (
                              <>
                                <ChevronUp className="h-3 w-3 mr-1" />
                                Skrýt
                              </>
                            ) : (
                              <>
                                <Pencil className="h-3 w-3 mr-1" />
                                Upravit
                              </>
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                    
                    <CollapsibleContent>
                      <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                        <div className="space-y-1">
                          <Label htmlFor="billing_company_name" className="text-xs">Název firmy / Jméno *</Label>
                          <Input
                            id="billing_company_name"
                            value={billingForm.company_name}
                            onChange={(e) => setBillingForm({ ...billingForm, company_name: e.target.value })}
                            placeholder="Jan Novák - Instalatérství"
                            className="h-8 text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="billing_ico" className="text-xs">IČO (volitelné)</Label>
                            <Input
                              id="billing_ico"
                              value={billingForm.ico}
                              onChange={(e) => setBillingForm({ ...billingForm, ico: formatIco(e.target.value) })}
                              placeholder="12345678"
                              maxLength={8}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="billing_dic" className="text-xs">DIČ (volitelné)</Label>
                            <Input
                              id="billing_dic"
                              value={billingForm.dic}
                              onChange={(e) => setBillingForm({ ...billingForm, dic: formatDic(e.target.value) })}
                              placeholder="CZ12345678"
                              maxLength={12}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="billing_street" className="text-xs">Ulice a č.p. *</Label>
                          <Input
                            id="billing_street"
                            value={billingForm.street}
                            onChange={(e) => setBillingForm({ ...billingForm, street: e.target.value })}
                            placeholder="Hlavní 123"
                            className="h-8 text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1 col-span-2">
                            <Label htmlFor="billing_city" className="text-xs">Město *</Label>
                            <Input
                              id="billing_city"
                              value={billingForm.city}
                              onChange={(e) => setBillingForm({ ...billingForm, city: e.target.value })}
                              placeholder="Praha"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="billing_zip" className="text-xs">PSČ *</Label>
                            <Input
                              id="billing_zip"
                              value={billingForm.zip}
                              onChange={(e) => setBillingForm({ ...billingForm, zip: formatZip(e.target.value) })}
                              placeholder="110 00"
                              maxLength={6}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                {/* Legal Consent Checkbox - only for credits, not subscription */}
                {selectedPackage && (
                  <>
                    <div 
                      className={cn(
                        "flex items-start gap-2 p-3 rounded-lg border transition-colors",
                        showWaiverError && !refundWaiverAccepted 
                          ? "border-destructive bg-destructive/10 animate-shake" 
                          : "border-border bg-white dark:bg-zinc-800"
                      )}
                    >
                      <Checkbox
                        id="refundWaiver"
                        checked={refundWaiverAccepted}
                        onCheckedChange={(checked) => {
                          setRefundWaiverAccepted(checked === true);
                          if (checked) setShowWaiverError(false);
                        }}
                        disabled={loading}
                        className="mt-0.5 border-foreground data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
                      />
                      <Label 
                        htmlFor="refundWaiver" 
                        className="text-[11px] leading-relaxed cursor-pointer font-normal text-foreground"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 inline-block mr-1 text-foreground" />
                        Žádám o dodání kreditů ihned a beru na vědomí, že tím{" "}
                        <strong>ztrácím právo na odstoupení od smlouvy</strong>.
                      </Label>
                    </div>
                    {showWaiverError && !refundWaiverAccepted && (
                      <p className="text-[10px] text-destructive flex items-center gap-1 px-1 -mt-2">
                        <AlertCircle className="h-3 w-3" />
                        Pro pokračování musíte souhlasit s podmínkami.
                      </p>
                    )}
                  </>
                )}

                {/* Subscription info for PRO */}
                {selectedProMembership && (
                  <div className="flex items-start gap-2 p-3 rounded-lg border border-border bg-white dark:bg-zinc-800">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Předplatné se automaticky obnovuje každý měsíc. Můžete ho kdykoliv zrušit.
                    </p>
                  </div>
                )}
              </div>

              {/* Pay Button */}
              <Button
                size="lg"
                className={cn(
                  "w-full h-10 text-sm font-semibold mt-3",
                  selectedProMembership && "bg-primary hover:bg-primary/90"
                )}
                onClick={handleConfirmPurchase}
                disabled={loading || (selectedPackage && !refundWaiverAccepted) || !isBillingFormValid}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    Zpracování...
                  </div>
                ) : selectedProMembership ? (
                  <>
                    <Crown className="h-4 w-4 mr-2" />
                    Aktivovat PRO za {currentPrice} Kč/měs.
                  </>
                ) : (
                  `Zaplatit ${currentPrice} Kč`
                )}
              </Button>

              {/* Footer */}
              <p className="text-xs text-muted-foreground text-center mt-2">
                Platba je bezpečná a šifrovaná.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PointsPurchaseDialog;
