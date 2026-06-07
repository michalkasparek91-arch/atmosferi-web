import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, ArrowLeft, ArrowRight, Calendar, Wrench, MapPin, Coins, Info, Lock, Flame } from "lucide-react";
import { safeGoBack } from "@/utils/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { toast } from "@/hooks/use-toast";
import { geocodeAddress } from "@/lib/geocode-address";
import { AddressAutocompleteInput } from "@/components/AddressAutocompleteInput";
import SubcategoryDialog from "@/components/SubcategoryDialog";
import AuthDialog from "@/components/AuthDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { WorkerLocationMap } from "@/components/WorkerLocationMap";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { cn, generateId } from "@/lib/utils";
import { compressJobPhoto } from "@/lib/image-compression";
import { pingIndexNow } from "@/lib/seo";
import { AiDescriptionAssistant } from "@/components/AiDescriptionAssistant";
import { Sparkles } from "lucide-react";

const formSchema = z.object({
  categoryId: z.string().min(1, "Vyberte kategorii práce"),
  subcategoryId: z.string().min(1, "Vyberte typ práce"),
  deadlineType: z.enum(["asap", "agreement", "specific"]).default("asap"),
  date: z.date().optional(),
  description: z.string().min(20, "Popis musí mít alespoň 20 znaků").max(500, "Popis může mít maximálně 500 znaků"),
  streetName: z.string().min(1, "Ulice je povinná"),
  streetNumber: z.string().min(1, "Číslo popisné je povinné"),
  postalCode: z.string().min(1, "PSČ je povinné"),
  city: z.string().min(1, "Město je povinné"),
  priceNote: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const JobPosting = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const subcategoryParam = searchParams.get("subcategory");
  
  const savedStepStr = localStorage.getItem('jobPostingStep');
  const initialStep = savedStepStr ? Number(savedStepStr) : 1;
  const [step, setStepState] = useState(initialStep);
  
  // Sync step with browser history for back button support
  const setStep = (newStep: number) => {
    setStepState(newStep);
    localStorage.setItem('jobPostingStep', newStep.toString());
    // Push state only when moving forward
    if (newStep > step) {
      window.history.pushState({ step: newStep }, '', window.location.href);
    }
  };

  // Handle browser back button
  useEffect(() => {
    // Push initial state
    window.history.replaceState({ step: initialStep }, '', window.location.href);
    
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.step) {
        setStepState(event.state.step);
        localStorage.setItem('jobPostingStep', event.state.step.toString());
      } else {
        // If no step in state, go back one step or exit
        setStepState(prev => {
          if (prev > 1) {
            localStorage.setItem('jobPostingStep', (prev - 1).toString());
            return prev - 1;
          }
          // Let the navigation happen naturally (exit form)
          return prev;
        });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [initialStep]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [jobCoordinates, setJobCoordinates] = useState<{ lat: number; lng: number } | null>(() => {
    try {
      const saved = localStorage.getItem('jobPostingCoordinates');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [termsAccepted, setTermsAccepted] = useState(() => localStorage.getItem('jobPostingTerms') === 'true');
  const [marketingConsent, setMarketingConsent] = useState(() => localStorage.getItem('jobPostingMarketing') === 'true');
  const [isUrgent, setIsUrgent] = useState(() => localStorage.getItem('jobPostingUrgent') === 'true');
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  // Fetch current user for summary display
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
      
      return { ...user, profile };
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: (() => {
      let savedDraft: Partial<FormData> = {};
      try {
        const savedStr = localStorage.getItem('jobPostingDraft');
        if (savedStr) {
          const parsed = JSON.parse(savedStr);
          if (parsed.date) {
            const parsedDate = new Date(parsed.date);
            if (!isNaN(parsedDate.getTime())) {
              parsed.date = parsedDate;
            } else {
              delete parsed.date;
            }
          }
          savedDraft = parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved job draft', e);
      }
      return {
        categoryId: categoryParam || savedDraft.categoryId || "",
        subcategoryId: subcategoryParam || savedDraft.subcategoryId || "",
        deadlineType: savedDraft.deadlineType || "asap",
        date: savedDraft.date || undefined,
        description: savedDraft.description || "",
        streetName: savedDraft.streetName || "",
        streetNumber: savedDraft.streetNumber || "",
        postalCode: savedDraft.postalCode || "",
        city: savedDraft.city || "",
        priceNote: savedDraft.priceNote || "",
      };
    })(),
  });

  // Save form data to localStorage on change
  useEffect(() => {
    const subscription = form.watch((value) => {
      localStorage.setItem('jobPostingDraft', JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Save auxiliary state to localStorage
  useEffect(() => {
    if (jobCoordinates) localStorage.setItem('jobPostingCoordinates', JSON.stringify(jobCoordinates));
    else localStorage.removeItem('jobPostingCoordinates');
  }, [jobCoordinates]);

  useEffect(() => {
    localStorage.setItem('jobPostingTerms', termsAccepted.toString());
  }, [termsAccepted]);

  useEffect(() => {
    localStorage.setItem('jobPostingMarketing', marketingConsent.toString());
  }, [marketingConsent]);

  useEffect(() => {
    localStorage.setItem('jobPostingUrgent', isUrgent.toString());
  }, [isUrgent]);

  // Load initial AI description if available
  useEffect(() => {
    const aiDesc = sessionStorage.getItem("ai_initial_description");
    if (aiDesc) {
      form.setValue('description', aiDesc);
      sessionStorage.removeItem("ai_initial_description");
    }
  }, []);

  // Set category and subcategory when params change
  useEffect(() => {
    if (categoryParam) {
      form.setValue('categoryId', categoryParam);
    }
    if (subcategoryParam) {
      form.setValue('subcategoryId', subcategoryParam);
    }
  }, [categoryParam, subcategoryParam]);

  // Check for pending job submission on mount (after email confirmation redirect)
  useEffect(() => {
    const pendingFlag = sessionStorage.getItem('pendingJobSubmit');
    if (pendingFlag === 'true') {
      setPendingSubmit(true);
    }
  }, []);

  // Listen for auth changes - just close the dialog, let Index.tsx handle job creation
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Close the auth dialog - Index.tsx will handle the job creation after redirect
        setAuthDialogOpen(false);
        setPendingSubmit(false);
        // Navigate to home which will trigger job creation in Index.tsx
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch all categories
  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  // Fetch all subcategories to count them per category
  const { data: allSubcategories = [] } = useQuery({
    queryKey: ['all-subcategories-for-sorting'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_subcategories')
        .select('id, category_id');
      if (error) throw error;
      return data;
    },
  });

  // Sort categories by number of subcategories (most first)
  const categories = [...allCategories].sort((a, b) => {
    const countA = allSubcategories.filter(sub => sub.category_id === a.id).length;
    const countB = allSubcategories.filter(sub => sub.category_id === b.id).length;
    return countB - countA;
  });

  // Fetch subcategories for selected category
  const selectedCategoryId = form.watch('categoryId');
  const { data: subcategories = [] } = useQuery({
    queryKey: ['subcategories', selectedCategoryId],
    queryFn: async () => {
      if (!selectedCategoryId) return [];
      const { data, error } = await supabase
        .from('service_subcategories')
        .select('*')
        .eq('category_id', selectedCategoryId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCategoryId,
  });

  // Generate title from category and subcategory for database storage
  const generateTitle = () => {
    const categoryId = form.getValues('categoryId');
    const subcategoryId = form.getValues('subcategoryId');
    if (categoryId && subcategoryId && categories.length > 0 && subcategories.length > 0) {
      const category = categories.find(cat => cat.id === categoryId);
      const subcategory = subcategories.find(sub => sub.id === subcategoryId);
      if (category && subcategory) {
        return `${category.name} - ${subcategory.name}`;
      }
    }
    return 'Zakázka';
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    console.log(`[PhotoUpload] Attempting to select ${files?.length || 0} files on device`);
    
    if (files) {
      if (files.length === 0) {
        console.warn("[PhotoUpload] zero files returned from input");
      }
      const newPhotos = Array.from(files).slice(0, 5 - photos.length);
      console.log(`[PhotoUpload] Adding ${newPhotos.length} valid images to state`);
      setPhotos(prev => [...prev, ...newPhotos]);
      // Reset input value so same file can be picked again if removed
      e.target.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormData) => {
    try {
      setUploading(true);

      // Geocode address from manual fields
      const geoResult = await geocodeAddress(data.streetName, data.streetNumber, data.city, data.postalCode);
      if (geoResult) setJobCoordinates(geoResult);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Ensure post-auth navigation stays in customer context (even for user_type='both')
        localStorage.setItem('postAuthRedirect', '/zakaznik/poptavky');

        // Upload photos to a temporary path BEFORE auth so we don't lose them.
        const tempPhotoUrls = await Promise.all(
          photos.map(async (photo) => {
            const compressedPhoto = await compressJobPhoto(photo);
            const fileName = `temp/${generateId()}.jpg`;
            const { error: uploadError } = await supabase.storage
              .from('job-photos')
              .upload(fileName, compressedPhoto, {
                contentType: 'image/jpeg',
                upsert: false,
              });
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage
              .from('job-photos')
              .getPublicUrl(fileName);
            return publicUrl;
          })
        );

        // Store all form data + uploaded temp photo URLs for submission after auth
        const reconstructedAddress = `${data.streetName} ${data.streetNumber}, ${data.postalCode} ${data.city}`.trim();
        sessionStorage.setItem('pendingJobData', JSON.stringify({
          categoryId: data.categoryId,
          subcategoryId: data.subcategoryId,
          title: generateTitle(),
          description: data.description,
          fullAddress: reconstructedAddress,
          city: data.city,
          priceNote: data.priceNote || null,
          deadlineType: data.deadlineType,
          date: data.date?.toISOString() || null,
          isUrgent: isUrgent,
        }));

        sessionStorage.setItem('pendingJobTempPhotoUrls', JSON.stringify(tempPhotoUrls));
        sessionStorage.setItem('pendingJobPhotoCount', photos.length.toString());
        sessionStorage.setItem('pendingJobSubmit', 'true');

        toast({
          title: "Přihlášení vyžadováno",
          description: "Po přihlášení bude zakázka automaticky vytvořena (včetně fotek)",
          variant: "default",
        });

        setPendingSubmit(true);
        setAuthDialogOpen(true);
        setUploading(false);
        return;
      }

      // Upload photos first
      const photoUrls = await Promise.all(
        photos.map(async (photo) => {
          try {
            const compressedPhoto = await compressJobPhoto(photo);
            const fileName = `${user.id}/${generateId()}.jpg`;
            const { error: uploadError } = await supabase.storage
              .from('job-photos')
              .upload(fileName, compressedPhoto);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage
              .from('job-photos')
              .getPublicUrl(fileName);
            return publicUrl;
          } catch (err) {
            console.error('Photo upload failed for one file, skipping:', err);
            return null;
          }
        })
      ).then(urls => urls.filter((url): url is string => url !== null));

      // If urgent job is selected, redirect to payment first
      if (isUrgent) {
        // Store job data for creation after payment
        const urgentReconstructedAddress = `${data.streetName} ${data.streetNumber}, ${data.postalCode} ${data.city}`.trim();
        const jobDataForPayment = {
          customerId: user.id,
          categoryId: data.categoryId,
          subcategoryId: data.subcategoryId,
          title: generateTitle(),
          description: data.description,
          fullAddress: urgentReconstructedAddress,
          city: data.city,
          priceNote: data.priceNote || null,
          deadlineType: data.deadlineType,
          deadlineDate: data.deadlineType === 'specific' ? data.date?.toISOString() : null,
          photos: photoUrls,
          latitude: jobCoordinates?.lat || null,
          longitude: jobCoordinates?.lng || null,
        };

        // Store in sessionStorage for retrieval after payment
        sessionStorage.setItem('pendingUrgentJobData', JSON.stringify(jobDataForPayment));

        // Call edge function to create Stripe checkout
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-urgent-job-checkout', {
          body: { jobData: jobDataForPayment }
        });

        if (checkoutError) {
          throw new Error(checkoutError.message || 'Failed to create checkout session');
        }

        if (checkoutData?.url) {
          // Redirect to Stripe checkout
          window.location.href = checkoutData.url;
          return;
        } else {
          throw new Error('No checkout URL received');
        }
      }

      // Create job (non-urgent flow)
      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert([
          {
            customer_id: user.id,
            category_id: data.categoryId,
            subcategory_id: data.subcategoryId,
            title: generateTitle(),
            description: data.description,
            city: data.city,
            full_address: `${data.streetName} ${data.streetNumber}, ${data.postalCode} ${data.city}`.trim(),
            budget_min: null,
            budget_max: null,
            price_note: data.priceNote || null,
            photos: photoUrls,
            status: 'open',
            deadline_type: data.deadlineType,
            deadline_date: data.deadlineType === 'specific' ? data.date?.toISOString() : null,
            latitude: jobCoordinates?.lat || null,
            longitude: jobCoordinates?.lng || null,
            is_urgent: false,
          }
        ])
        .select()
        .single();

      if (jobError) throw jobError;

      // Ping IndexNow if job has a slug
      if (newJob?.slug) {
        pingIndexNow(`/poptavka/${newJob.slug}`);
      }

      // Log conversion
      import('@/lib/analytics').then(({ analytics }) => {
        analytics.trackConversion('job_posted', { 
          subcategory_id: data.subcategoryId,
          is_urgent: false
        });
      });

      // Update user profile with email preferences based on consent
      const profileUpdate: Record<string, any> = {
        email_notifications: true,
        email_new_offers: true,
        terms_accepted_at: new Date().toISOString(),
      };
      
      if (marketingConsent) {
        profileUpdate.marketing_notifications = true;
        profileUpdate.marketing_consent_at = new Date().toISOString();
      }

      // Fire-and-forget profile update (non-critical)
      supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id)
        .then(({ error }) => { if (error) console.warn('Profile update failed:', error); });

      // Notify workers about the new job (fire and forget)
      if (newJob) {
        supabase.functions.invoke('notify-workers-new-job', {
          body: { job: newJob }
        }).catch(err => console.log('[Push] Failed to notify workers:', err));
      }

      // Clear any pending job data
      sessionStorage.removeItem('pendingJobData');
      sessionStorage.removeItem('pendingJobPhotoCount');
      localStorage.removeItem('jobPostingDraft');
      localStorage.removeItem('jobPostingStep');
      localStorage.removeItem('jobPostingCoordinates');
      localStorage.removeItem('jobPostingTerms');
      localStorage.removeItem('jobPostingMarketing');
      localStorage.removeItem('jobPostingUrgent');

      toast({
        title: "Úspěch",
        description: "Zakázka byla úspěšně vytvořena!",
      });
      
      navigate("/zakaznik/poptavky");
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const nextStep = async () => {
    if (step === 1) {
      // Validate first step fields (subcategory + description)
      const isValid = await form.trigger(['subcategoryId', 'description']);
      if (!isValid) {
        toast({
          title: "Vyžadovaná pole",
          description: "Vyplňte prosím všechna povinná pole",
          variant: "destructive",
        });
        return;
      }
    }
    if (step === 2) {
      // Validate address fields
      const isValid = await form.trigger(['streetName', 'streetNumber', 'postalCode', 'city']);
      if (!isValid) {
        toast({
          title: "Vyžadovaná pole",
          description: "Vyplňte prosím všechna pole adresy",
          variant: "destructive",
        });
        return;
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) {
      setStepState(step - 1);
    } else {
      navigate("/zakaznik/nova-zakazka");
    }
  };

  const progress = (step / 4) * 100;

  return (
    <div className="min-h-screen bg-background py-4 px-3 md:px-4 pb-32 flex justify-center">
      <div className="max-w-3xl w-full">
        <Button
          variant="ghost"
          onClick={() => safeGoBack(navigate, '/zakaznik/nova-zakazka')}
          className="mb-2 rounded-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zpět
        </Button>

        <button
          type="button"
          onClick={() => navigate("/nova-poptavka/asistent")}
          className="mb-3 w-full flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 hover:bg-primary/15 transition px-4 py-3 text-left"
        >
          <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight">Zkusit s AI asistentem</p>
            <p className="text-xs text-muted-foreground leading-tight">Místo formuláře — popíšete práci v chatu a my doplníme zbytek.</p>
          </div>
          <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
        </button>

        <Card className="border-0 shadow-none bg-transparent md:bg-card md:border md:shadow-sm">
          <CardHeader className="pb-3 pt-4 px-0 md:px-6">
            <CardTitle className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Krok {step} z 4</CardTitle>
            <Progress value={progress} className="mt-2 h-1.5" />
          </CardHeader>
          <CardContent className="pb-4 px-0 md:px-6 [&_input]:bg-input-fill [&_input]:text-input-fill-foreground [&_input::placeholder]:text-muted-foreground [&_input]:border-input [&_input]:rounded-full [&_textarea]:bg-input-fill [&_textarea]:text-input-fill-foreground [&_textarea::placeholder]:text-muted-foreground [&_textarea]:border-input [&_textarea]:rounded-2xl [&_button[role=combobox]]:bg-input-fill [&_button[role=combobox]]:text-input-fill-foreground [&_select]:bg-input-fill [&_.select-trigger]:bg-input-fill [&_.select-trigger]:border-input [&_.select-trigger]:rounded-full [&_button:not(.bg-lime-400):not(.bg-lime-500):not(.bg-primary):not(.h-5)]:bg-input-fill [&_button:not(.bg-lime-400):not(.bg-lime-500):not(.bg-primary):not(.h-5)]:text-input-fill-foreground [&_button:not(.bg-lime-400):not(.bg-lime-500):not(.bg-primary):not(.h-5)]:border-input [&_button:not(.bg-lime-400):not(.bg-lime-500):not(.bg-primary):not(.h-5)]:rounded-full [&_[data-placeholder]]:text-muted-foreground">
            {step === 1 && (
              <Form {...form}>
                <div className="space-y-4">
                  <h3 className="text-sm font-medium tracking-tight">Detaily zakázky</h3>
                  
                  <div className="min-h-[380px] space-y-4">
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kategorie práce</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-full">
                              <SelectValue placeholder="Vyberte kategorii práce..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => {
                              const Icon = getCategoryIcon(category.icon, category.slug);
                              return (
                                <SelectItem key={category.id} value={category.id}>
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    <span>{category.name}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subcategoryId"
                    render={({ field }) => {
                      const selectedSubcategory = subcategories.find(s => s.id === field.value);
                      const priceRange = selectedSubcategory?.price_range;
                      
                      return (
                        <FormItem>
                          <FormLabel>Typ práce</FormLabel>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                              onClick={() => setSubcategoryDialogOpen(true)}
                              disabled={!selectedCategoryId}
                            >
                              {field.value && subcategories.length > 0
                                ? selectedSubcategory?.name
                                : "Vyberte konkrétní službu..."}
                            </Button>
                          </FormControl>
                          {priceRange && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Obvyklá cena: {priceRange}
                            </p>
                          )}
                          <FormMessage />
                          <SubcategoryDialog
                            open={subcategoryDialogOpen}
                            onOpenChange={setSubcategoryDialogOpen}
                            subcategories={subcategories}
                            selectedSubcategoryId={field.value}
                            onSelect={field.onChange}
                            categoryName={categories.find(c => c.id === selectedCategoryId)?.name || ""}
                          />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="deadlineType"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-sm">Termín dokončení</FormLabel>
                        <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full">
                          <Button
                            type="button"
                            variant={field.value === "asap" ? "default" : "outline"}
                            className="flex-1 justify-center h-10 px-2 sm:px-4"
                            onClick={() => {
                              field.onChange("asap");
                              form.setValue("date", undefined);
                            }}
                          >
                            <span className="truncate">Co nejdříve</span>
                          </Button>
                          <Button
                            type="button"
                            variant={field.value === "agreement" ? "default" : "outline"}
                            className="flex-1 justify-center h-10 px-2 sm:px-4"
                            onClick={() => {
                              field.onChange("agreement");
                              form.setValue("date", undefined);
                            }}
                          >
                            <span className="truncate">Dle dohody</span>
                          </Button>
                          <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant={field.value === "specific" ? "default" : "outline"}
                                className="flex-1 justify-center h-10 px-3 sm:px-4"
                                onClick={() => {
                                  field.onChange("specific");
                                  setEndDateOpen(true);
                                }}
                              >
                                <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
                                <span className="whitespace-nowrap">
                                  {field.value === "specific" && form.watch("date") ? (
                                    format(form.watch("date")!, "PPP", { locale: cs })
                                  ) : (
                                    "Konkrétní datum"
                                  )}
                                </span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="center">
                              <CalendarComponent
                                mode="single"
                                selected={form.watch("date")}
                                onSelect={(date) => {
                                  form.setValue("date", date);
                                  setEndDateOpen(false);
                                }}
                                disabled={(date) => date < new Date()}
                                initialFocus
                                locale={cs}
                                className="w-full pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-sm">Popis práce *</FormLabel>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setAiAssistantOpen(true)}
                            className="h-7 px-2 text-[10px] font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-full border border-primary/20 transition-all group"
                          >
                            <Sparkles className="h-3 w-3 mr-1 text-primary group-hover:scale-110 transition-transform" />
                            POMOCNÍK S POPISEM
                          </Button>
                        </div>
                        <FormControl>
                          <Textarea
                            placeholder="Popište podrobně práci, kterou potřebujete..."
                            rows={3}
                            maxLength={500}
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                            Detailní popis pomůže řemeslníkům lépe pochopit rozsah práce a nabídnout přesnější cenu.
                          </p>
                          <p className="text-xs text-muted-foreground flex-shrink-0">{field.value?.length || 0}/500</p>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <AiDescriptionAssistant
                    open={aiAssistantOpen}
                    onOpenChange={setAiAssistantOpen}
                    categoryName={categories.find(c => c.id === selectedCategoryId)?.name || ""}
                    subcategoryName={subcategories.find(s => s.id === form.getValues('subcategoryId'))?.name || ""}
                    onSelect={(text) => form.setValue('description', text)}
                  />

                  <FormField
                    control={form.control}
                    name="priceNote"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Poznámka k ceně (nepovinné)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="Např. maximální rozpočet, preference..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <Lock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    Vaše příjmení ani e-mail nikdy neuvidí řemeslníci. Zobrazí se pouze vaše křestní jméno.
                  </p>
                  </div>

                  <Button onClick={nextStep} className="w-full h-10">
                    Další <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <p className="text-[11px] text-center text-emerald-600 dark:text-emerald-500 font-medium mt-3">✅ Zadání poptávky je zdarma a zcela nezávazné.</p>
                </div>
              </Form>
            )}

            {step === 2 && (
              <Form {...form}>
                <div className="space-y-4">
                  <h3 className="text-sm font-medium tracking-tight">Adresa zakázky</h3>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Adresu používáme k nalezení řemeslníků ve Vašem okolí. U online služeb zadejte svou fakturační adresu.
                  </p>
                  
                  <div className="min-h-[380px] space-y-4">

                  <AddressAutocompleteInput
                    onSelect={(result) => {
                      form.setValue("streetName", result.streetName);
                      form.setValue("streetNumber", result.streetNumber);
                      form.setValue("postalCode", result.postalCode);
                      form.setValue("city", result.city);
                      setJobCoordinates({ lat: result.lat, lng: result.lng });
                    }}
                    placeholder="Začněte psát adresu..."
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="streetName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Ulice *</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value as string} placeholder="např. Karlova" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="streetNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Číslo popisné *</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value as string} placeholder="např. 15" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">PSČ *</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value as string} placeholder="např. 110 00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Město *</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value as string} placeholder="např. Praha" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    Přesná adresa bude odhalena až po potvrzení spojení s vybraným řemeslníkem.
                   </p>
                   <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                     <Lock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                     Řemeslníci uvidí pouze město, dokud nepotvrdíte spolupráci.
                   </p>
                   </div>
                  
                  <div className="flex gap-4">
                    <Button variant="outline" onClick={prevStep} className="flex-1 h-10 rounded-full">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Zpět
                    </Button>
                    <Button onClick={nextStep} className="flex-1 h-10">
                      Další <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-center text-emerald-600 dark:text-emerald-500 font-medium mt-3">📍 Vaši přesnou adresu nikde veřejně nesdílíme.</p>
                </div>
              </Form>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium tracking-tight">Přidat fotografie (volitelné)</h3>
                <div className="min-h-[380px] space-y-3">
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <button 
                      type="button"
                      onClick={() => document.getElementById('job-photo-upload')?.click()}
                      className="w-full h-full cursor-pointer"
                    >
                      <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                      <p className="text-sm font-semibold mb-1">Klikněte pro výběr fotek</p>
                      <p className="text-xs text-muted-foreground mb-3 px-4">
                        Můžete vybrat až 5 fotografií najednou (JPG, PNG, HEIC)
                      </p>
                      <div className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                        Vybrat soubory
                      </div>
                    </button>
                    <input
                      id="job-photo-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                  
                  {photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Náhled ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 h-6 w-6 p-0"
                            onClick={() => removePhoto(index)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    Fotografie pomohou řemeslníkům lépe odhadnout rozsah a cenu práce.
                  </p>
                </div>
                
                <div className="flex gap-4">
                  <Button variant="outline" onClick={prevStep} className="flex-1 h-10 rounded-full">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Zpět
                  </Button>
                  <Button onClick={nextStep} className="flex-1 h-10">
                    Další <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <TooltipProvider>
                    {/* Credit Card Style Layout */}
                    <div className="rounded-2xl p-6 space-y-5">
                      {/* Top Section: Category Icon + Name */}
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          {(() => {
                            const category = categories.find(c => c.id === form.getValues('categoryId'));
                            const Icon = getCategoryIcon(category?.icon || 'Wrench', category?.slug);
                            return <Icon className="h-6 w-6 text-primary-foreground" />;
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-tight">
                            {subcategories.find(s => s.id === form.getValues('subcategoryId'))?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {categories.find(c => c.id === form.getValues('categoryId'))?.name}
                          </p>
                        </div>
                      </div>

                      {/* Details Pills */}
                      <div className="flex flex-wrap gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 bg-background/60 backdrop-blur-sm rounded-full px-3 py-1.5 border border-border/40 cursor-help">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {form.getValues('streetName')} {form.getValues('streetNumber')}, {form.getValues('city')}
                              </span>
                              <Info className="h-3 w-3 text-muted-foreground/60" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Místo realizace zakázky</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 bg-background/60 backdrop-blur-sm rounded-full px-3 py-1.5 border border-border/40 cursor-help">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {form.getValues('deadlineType') === 'asap' && 'Co nejdříve'}
                                {form.getValues('deadlineType') === 'agreement' && 'Dle dohody'}
                                {form.getValues('deadlineType') === 'specific' && form.getValues('date') && 
                                  format(form.getValues('date')!, "d.M.yyyy", { locale: cs })}
                              </span>
                              <Info className="h-3 w-3 text-muted-foreground/60" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Termín do kdy má být zakázka hotova</p>
                          </TooltipContent>
                        </Tooltip>

                      </div>

                      {/* Description */}
                      <div>
                        <p className="text-sm text-foreground leading-relaxed">
                          {form.getValues('description')}
                        </p>
                        {form.getValues('priceNote') && (
                          <p className="text-xs text-muted-foreground italic mt-3">
                            Poznámka k ceně: {form.getValues('priceNote')}
                          </p>
                        )}
                      </div>
                      {/* Photos - Square Grid (35% smaller) */}
                      {photos.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 max-w-md">
                          {photos.map((photo, index) => (
                            <div key={index} className="aspect-square rounded-lg overflow-hidden border border-border/30 shadow-sm">
                              <img
                                src={URL.createObjectURL(photo)}
                                alt={`Náhled ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Customer Info - Bottom */}
                      <div className="flex items-center gap-2 pt-3 border-t border-border/30">
                        {currentUser?.profile?.avatar_url ? (
                          <img
                            src={currentUser.profile.avatar_url}
                            alt="Profile"
                            className="h-5 w-5 rounded-full object-cover ring-1 ring-border"
                          />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center ring-1 ring-border">
                            <span className="text-xs font-medium">
                              {currentUser?.profile?.full_name?.charAt(0) || currentUser?.email?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <p className="text-xs font-medium text-muted-foreground">
                          {currentUser?.profile?.full_name?.split(' ')[0] || 'Zákazník'}
                        </p>
                      </div>
                    </div>
                  </TooltipProvider>

                  {/* Urgent Job Upsell */}
                  <div 
                    className={cn(
                      "rounded-xl border-2 p-4 cursor-pointer transition-all",
                      isUrgent 
                        ? "border-orange-500 bg-orange-500/10" 
                        : "border-border hover:border-orange-300"
                    )}
                    onClick={() => setIsUrgent(!isUrgent)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        id="urgent-job"
                        checked={isUrgent}
                        onCheckedChange={(checked) => setIsUrgent(checked === true)}
                        className="mt-0.5 border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Flame className="h-4 w-4 text-orange-500" />
                          <span className="font-semibold text-sm">Urgentní poptávka</span>
                          <span className="text-xs font-bold text-orange-600 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">
                            +49 Kč
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Spěcháte? Označíme vaši poptávku jako HAVÁRIE a okamžitě upozorníme všechny řemeslníky v okolí SMS zprávou.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Consent Section - Conditional based on login state */}
                  {!currentUser ? (
                    /* Guest users see checkboxes */
                    <div className="space-y-4 pt-2">
                      {/* Checkbox A - Mandatory GDPR & Terms */}
                      <div className="flex items-start space-x-3">
                        <Checkbox 
                          id="terms-consent"
                          checked={termsAccepted}
                          onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                          className="mt-0.5"
                        />
                        <label 
                          htmlFor="terms-consent" 
                          className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                        >
                          Souhlasím s{" "}
                          <Link to="/podminky" className="text-primary underline hover:no-underline" target="_blank">
                            Obchodními podmínkami
                          </Link>{" "}
                          a{" "}
                          <Link to="/ochrana-udaju" className="text-primary underline hover:no-underline" target="_blank">
                            Zásadami ochrany soukromí
                          </Link>
                          . Rozumím, že Zrobee funguje jako tržiště a mé telefonní číslo bude předáno vybraným dodavatelům za účelem nabídky.
                        </label>
                      </div>

                      {/* Checkbox B - Optional Marketing */}
                      <div className="flex items-start space-x-3">
                        <Checkbox 
                          id="marketing-consent"
                          checked={marketingConsent}
                          onCheckedChange={(checked) => setMarketingConsent(checked === true)}
                          className="mt-0.5"
                        />
                        <label 
                          htmlFor="marketing-consent" 
                          className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                        >
                          Chci dostávat tipy na údržbu domácnosti a sezónní inspiraci.
                        </label>
                      </div>
                    </div>
                  ) : null}

                   <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                     <Lock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                     Vaše kontaktní údaje budou sdíleny pouze s řemeslníkem, kterého si vyberete.
                   </p>

                   {/* Action Buttons */}
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prevStep}
                      className="flex-1 h-11 rounded-full"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" /> Zpět
                    </Button>
                    <Button
                      type="submit"
                      className={cn(
                        "flex-1 h-11 font-semibold",
                        isUrgent && "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                      )}
                      disabled={uploading || (!currentUser && !termsAccepted)}
                    >
                      {uploading ? "Vytváření..." : (
                        isUrgent ? (
                          <>
                            <Flame className="mr-2 h-4 w-4" />
                            Zaplatit 49 Kč a odeslat
                          </>
                        ) : "Odeslat poptávku"
                      )}
                    </Button>
                  </div>
                  <p className="text-[11px] text-center text-emerald-600 dark:text-emerald-500 font-medium mt-3 mb-1">⚡ 85 % zákazníků dostane první nabídky už do 2 hodin.</p>

                  {/* UX Micro-copy - Different for logged-in vs guest */}
                  {currentUser ? (
                    <p className="text-xs text-muted-foreground text-center">
                      <Lock className="inline h-3 w-3 mr-1" />
                      Kliknutím potvrzujete odeslání. Vaše číslo bude zpřístupněno maximálně 5 ověřeným dodavatelům dle{" "}
                      <Link to="/podminky" className="underline hover:no-underline" target="_blank">
                        podmínek
                      </Link>{" "}
                      odsouhlasených při registraci.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center">
                      <Lock className="inline h-3 w-3 mr-1" />
                      Vaše číslo je u nás v bezpečí. Nezobrazujeme ho veřejně na internetu.
                    </p>
                  )}
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  );
};

export default JobPosting;
