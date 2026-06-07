import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { pingIndexNow } from "@/lib/seo";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Pencil, X, Upload, Star, MapPin, Phone, Building2 } from "lucide-react";
import * as Icons from "lucide-react";
import CityAutocomplete from "./CityAutocomplete";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { compressProfilePhoto } from "@/lib/image-compression";
import { AvatarCropper } from "./AvatarCropper";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { GoogleMapsConnect } from "./GoogleMapsConnect";
export const WorkerProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    slug: "",
    bio: "",
    company_type: "",
    city: "",
    region: "",
    country: "",
    avatar_url: "",
    portfolio_photos: [] as string[],
    google_place_id: null as string | null,
    google_rating: null as number | null,
    google_reviews_count: null as number | null,
    google_maps_url: null as string | null
  });
  const [workerServices, setWorkerServices] = useState<any[]>([]);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [avatarCropperOpen, setAvatarCropperOpen] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [displayAsCompany, setDisplayAsCompany] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [rawCompanyType, setRawCompanyType] = useState<string | null>(null);
  const [showBusinessDialog, setShowBusinessDialog] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessIco, setBusinessIco] = useState("");
  const [businessDic, setBusinessDic] = useState("");
  const [creatingBusiness, setCreatingBusiness] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileData) {
      const displayCompanyType = profileData.company_type === 'self_employed' ? 'OSVČ' : 
                                 profileData.company_type === 'company' ? 'Firma (s.r.o.)' : 
                                 profileData.company_type || '';
      
      setProfile({
        full_name: profileData.full_name || "",
        email: profileData.email || "",
        phone: profileData.phone || "",
        slug: profileData.slug || "",
        bio: profileData.bio || "",
        company_type: displayCompanyType,
        city: profileData.city || "",
        region: profileData.region || "",
        country: profileData.country || "Česká republika",
        avatar_url: profileData.avatar_url || "",
        portfolio_photos: profileData.portfolio_photos || [],
        google_place_id: profileData.google_place_id,
        google_rating: profileData.google_rating,
        google_reviews_count: profileData.google_reviews_count,
        google_maps_url: profileData.google_maps_url
      });
      setDisplayAsCompany(profileData.display_as_company || false);
      setCompanyId(profileData.company_id || null);
      setRawCompanyType(profileData.company_type || null);

      // Fetch business details if company_id exists
      if (profileData.company_id) {
        const { data: businessData } = await supabase
          .from('businesses')
          .select('name, ico, dic')
          .eq('id', profileData.company_id)
          .single();
        
        if (businessData) {
          setBusinessName(businessData.name || "");
          setBusinessIco(businessData.ico || "");
          setBusinessDic(businessData.dic || "");
        }
      }
    }

    const { data: servicesData } = await supabase
      .from('worker_services')
      .select('*, service_subcategories(*, service_categories(*))')
      .eq('worker_id', session.user.id);
    
    if (servicesData && servicesData.length > 0) {
      setWorkerServices(servicesData);
    }

    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*, jobs(title, completion_photos, final_price, subcategory_id, service_subcategories:subcategory_id(name, service_categories(name)))')
      .eq('reviewee_id', session.user.id)
      .order('created_at', { ascending: false });

    if (reviewsData) {
      setCompletedJobs(reviewsData);
    }

    setLoading(false);
  };

  const handleSave = async (field?: string) => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const dbCompanyType = profile.company_type === 'OSVČ' ? 'self_employed' : 
                          profile.company_type === 'Firma (s.r.o.)' ? 'company' : 
                          profile.company_type;

    const updateData: any = {
      full_name: profile.full_name,
      phone: profile.phone,
      bio: profile.bio,
      company_type: dbCompanyType,
      city: profile.city,
      region: profile.region,
      country: profile.country,
      avatar_url: profile.avatar_url,
      portfolio_photos: profile.portfolio_photos
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', session.user.id);

    let businessError = null;
    if (displayAsCompany && companyId) {
      const { error: bError } = await supabase
        .from('businesses')
        .update({
          name: businessName.trim(),
          ico: businessIco.trim() || null,
          dic: businessDic.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', companyId);
      businessError = bError;
    }

    if (profileError || businessError) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit profil" + (businessError ? " nebo firemní údaje" : ""),
        variant: "destructive",
      });
    } else {
      // Ping IndexNow if worker has a slug
      if (profile?.slug) {
        pingIndexNow(`/remeslnik/${profile.slug}`);
      }

      toast({
        title: "Úspěch",
        description: "Profil byl úspěšně uložen",
      });
      if (field) {
        setEditingField(null);
      }
    }
    setSaving(false);
  };

  const handleAvatarSelect = (file: File) => {
    setPendingAvatarFile(file);
    setAvatarCropperOpen(true);
  };

  const handleCroppedAvatar = async (croppedFile: File) => {
    await handleFileUpload(croppedFile, 'avatar');
    setPendingAvatarFile(null);
  };

  const handleFileUpload = async (file: File, type: 'avatar' | 'portfolio') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (type === 'avatar') setUploadingAvatar(true);
    if (type === 'portfolio') setUploadingPortfolio(true);

    const compressedFile = await compressProfilePhoto(file);
    const fileExt = 'webp';
    const fileName = `${session.user.id}/${type}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, compressedFile);

    if (uploadError) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se nahrát fotku",
        variant: "destructive",
      });
      if (type === 'avatar') setUploadingAvatar(false);
      if (type === 'portfolio') setUploadingPortfolio(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(fileName);

    if (type === 'avatar') {
      setProfile({ ...profile, avatar_url: publicUrl });
      setUploadingAvatar(false);
    } else if (type === 'portfolio') {
      setProfile({ ...profile, portfolio_photos: [...profile.portfolio_photos, publicUrl] });
      setUploadingPortfolio(false);
    }

    await handleSave();
  };

  const handleRemovePortfolioPhoto = async (index: number) => {
    const newPhotos = profile.portfolio_photos.filter((_, i) => i !== index);
    setProfile({ ...profile, portfolio_photos: newPhotos });
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase
      .from('profiles')
      .update({ portfolio_photos: newPhotos })
      .eq('id', session.user.id);
  };

  const getInitials = () => {
    return profile.full_name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getIcon = (iconName: string) => {
    const Icon = Icons[iconName as keyof typeof Icons] as any;
    return Icon || Icons.Wrench;
  };

  const averageRating = completedJobs.length > 0 
    ? (completedJobs.reduce((sum, job) => sum + job.rating, 0) / completedJobs.length).toFixed(1)
    : null;

  if (loading) {
    return <div className="text-center py-8 text-sm text-muted-foreground">Načítání...</div>;
  }

  const profileHeaderCard = (
    <Card className="overflow-hidden rounded-2xl">
      <div className="pt-5 pb-4 px-4 relative bg-gradient-to-br from-muted to-muted/50">
        <div className="flex flex-col items-center relative z-10">
          <div className="relative mb-2">
            <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="text-lg bg-muted text-muted-foreground">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <label className="absolute bottom-0 right-0 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAvatarSelect(e.target.files[0])}
                disabled={uploadingAvatar}
              />
              <div className="bg-primary hover:bg-primary/90 p-1.5 rounded-full shadow">
                <Pencil className="h-2.5 w-2.5 text-primary-foreground" />
              </div>
            </label>
          </div>

          <div className="flex items-center gap-2 mb-1">
            {editingField === 'full_name' ? (
              <div className="space-y-2 w-full">
                <Input
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Jméno a příjmení"
                  className="text-center text-sm h-8"
                />
                <div className="flex gap-2 justify-center">
                  <Button size="sm" className="h-7 text-xs" onClick={() => handleSave('full_name')}>Uložit</Button>
                  <Button size="sm" className="h-7 text-xs" variant="outline" onClick={() => setEditingField(null)}>Zrušit</Button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-sm font-semibold text-foreground">{profile.full_name || "Jméno"}</h2>
                {averageRating && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                    {averageRating} <Star className="h-2.5 w-2.5 fill-current" />
                  </span>
                )}
                <button onClick={() => setEditingField('full_name')} className="ml-1">
                  <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </>
            )}
          </div>

          {editingField !== 'full_name' && (
            <>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-0.5">
                <MapPin className="h-3 w-3" />
                {editingField === 'location' ? (
                  <div className="space-y-2 w-full mt-2">
                    <CityAutocomplete
                      value={profile.city}
                      onChange={(value) => setProfile({ ...profile, city: value })}
                      onLocationChange={(city, region, country) => {
                        setProfile({ ...profile, city, region, country });
                      }}
                      label=""
                      placeholder="Vyberte město..."
                    />
                    <div className="flex gap-2 justify-center">
                      <Button size="sm" className="h-7 text-xs" onClick={() => handleSave('location')}>Uložit</Button>
                      <Button size="sm" className="h-7 text-xs" variant="outline" onClick={() => setEditingField(null)}>Zrušit</Button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setEditingField('location')} className="hover:text-foreground text-[11px]">
                    {profile.city && profile.country ? `${profile.city}, ${profile.country}` : "Umístění"}
                  </button>
                )}
              </div>
              
              {editingField === 'company_type' ? (
                <div className="space-y-2 w-full mt-2">
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      variant={profile.company_type === 'OSVČ' ? 'default' : 'outline'}
                      onClick={() => setProfile({ ...profile, company_type: 'OSVČ' })}
                    >
                      OSVČ
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      variant={profile.company_type === 'Firma (s.r.o.)' ? 'default' : 'outline'}
                      onClick={() => setProfile({ ...profile, company_type: 'Firma (s.r.o.)' })}
                    >
                      Firma
                    </Button>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" className="h-7 text-xs" onClick={() => handleSave('company_type')}>Uložit</Button>
                    <Button size="sm" className="h-7 text-xs" variant="outline" onClick={() => setEditingField(null)}>Zrušit</Button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setEditingField('company_type')} className="text-[11px] text-primary hover:underline">
                  {profile.company_type || "Typ společnosti"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );

  const handleDisplayAsCompanyToggle = async (checked: boolean) => {
    if (checked && !companyId) {
      // No business yet — open creation dialog
      setBusinessName(profile.full_name || "");
      setBusinessIco("");
      setBusinessDic("");
      setShowBusinessDialog(true);
      return;
    }

    // Has business or toggling off — just update the flag
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('profiles')
      .update({ display_as_company: checked })
      .eq('id', session.user.id);

    if (error) {
      toast({ title: "Chyba", description: "Nepodařilo se změnit nastavení", variant: "destructive" });
    } else {
      setDisplayAsCompany(checked);
      
      // If toggling on, make sure we have business info
      if (checked && companyId && !businessName) {
        const { data: bData } = await supabase
          .from('businesses')
          .select('name, ico, dic')
          .eq('id', companyId)
          .single();
        if (bData) {
          setBusinessName(bData.name || "");
          setBusinessIco(bData.ico || "");
          setBusinessDic(bData.dic || "");
        }
      }

      toast({ title: "Uloženo", description: checked ? "Vystupujete pod firmou" : "Vystupujete pod osobním jménem" });
    }
  };

  const handleCreateBusiness = async () => {
    if (!businessName.trim()) {
      toast({ title: "Chyba", description: "Vyplňte název firmy", variant: "destructive" });
      return;
    }

    setCreatingBusiness(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setCreatingBusiness(false); return; }

    const companyType = rawCompanyType || 'self_employed';

    const { error } = await supabase.rpc('create_business', {
      p_name: businessName.trim(),
      p_ico: businessIco.trim() || null,
      p_dic: businessDic.trim() || null,
      p_company_type: companyType,
    });

    if (error) {
      toast({ title: "Chyba", description: error.message || "Nepodařilo se vytvořit firmu", variant: "destructive" });
      setCreatingBusiness(false);
      return;
    }

    // Set display_as_company = true
    await supabase
      .from('profiles')
      .update({ display_as_company: true })
      .eq('id', session.user.id);

    setDisplayAsCompany(true);
    setShowBusinessDialog(false);
    setCreatingBusiness(false);
    toast({ title: "Úspěch", description: "Firma byla vytvořena" });

    // Reload to get new company_id
    await loadProfile();
  };

  const businessToggleCard = (
    <Card className="rounded-2xl">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Vystupovat pod hlavičkou firmy</span>
          </div>
          <Switch
            checked={displayAsCompany}
            onCheckedChange={handleDisplayAsCompanyToggle}
          />
        </div>
        
        {displayAsCompany && companyId && (
          <div className="mt-4 pt-4 border-t border-border/50 animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="inline-biz-name" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider ml-1">
                  Název firmy / Jméno
                </Label>
                <Input
                  id="inline-biz-name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Název vaší firmy"
                  className="text-xs h-8 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary shadow-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="inline-biz-ico" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider ml-1">
                    IČO
                  </Label>
                  <Input
                    id="inline-biz-ico"
                    value={businessIco}
                    onChange={(e) => setBusinessIco(e.target.value)}
                    placeholder="12345678"
                    className="text-xs h-8 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary shadow-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inline-biz-dic" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider ml-1">
                    DIČ
                  </Label>
                  <Input
                    id="inline-biz-dic"
                    value={businessDic}
                    onChange={(e) => setBusinessDic(e.target.value)}
                    placeholder="CZ12345678"
                    className="text-xs h-8 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary shadow-none"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground italic px-1 pt-1 opacity-70">
                Tyto údaje se zobrazí zákazníkům ve vašem profilu.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const contactCard = (
    <Card className="rounded-2xl">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Kontakt</span>
          <button onClick={() => setEditingField('contact')}>
            <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
        
        {editingField === 'contact' ? (
          <div className="space-y-2">
            <Input
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="+420 123 456 789"
              className="text-sm h-8"
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={() => handleSave('contact')}>Uložit</Button>
              <Button size="sm" className="h-7 text-xs" variant="outline" onClick={() => setEditingField(null)}>Zrušit</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-foreground">{profile.phone || "Telefon nenastaven"}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const handleGoogleConnect = async (placeData: any) => {
    setProfile(prev => ({
      ...prev,
      google_place_id: placeData.place_id,
      google_rating: placeData.rating,
      google_reviews_count: placeData.user_ratings_total,
      google_maps_url: placeData.url
    }));
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('profiles').update({
      google_place_id: placeData.place_id,
      google_rating: placeData.rating,
      google_reviews_count: placeData.user_ratings_total,
      google_maps_url: placeData.url
    }).eq('id', session.user.id);
    toast({ title: "Úspěch", description: "Google Maps profil byl úspěšně propojen." });
  };

  const handleGoogleDisconnect = async () => {
    setProfile(prev => ({
      ...prev,
      google_place_id: null,
      google_rating: null,
      google_reviews_count: null,
      google_maps_url: null
    }));
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('profiles').update({
      google_place_id: null,
      google_rating: null,
      google_reviews_count: null,
      google_maps_url: null
    }).eq('id', session.user.id);
    toast({ title: "Odpojeno", description: "Google Maps profil byl odpojen." });
  };

  const googleMapsCard = (
    <Card className="rounded-2xl border-emerald-100 dark:border-emerald-900/30">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <img src="https://www.gstatic.com/images/branding/product/1x/maps_512dp.png" alt="Google" className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold text-foreground">Hodnocení Google</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
          Propojte svůj profil s Google Maps a získejte více důvěry od zákazníků dříve, než získáte recenze přímo na Zrobee.
        </p>
        <GoogleMapsConnect 
          placeId={profile.google_place_id}
          rating={profile.google_rating}
          reviewsCount={profile.google_reviews_count}
          mapsUrl={profile.google_maps_url}
          onConnect={handleGoogleConnect}
          onDisconnect={handleGoogleDisconnect}
        />
      </CardContent>
    </Card>
  );

  const bioCard = (
    <Card className="rounded-2xl">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-foreground">O mně</span>
          <button onClick={() => setEditingField('bio')}>
            <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
        
        {editingField === 'bio' ? (
          <div className="space-y-2">
            <Textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Napište něco o sobě..."
              rows={3}
              className="text-xs"
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={() => handleSave('bio')}>Uložit</Button>
              <Button size="sm" className="h-7 text-xs" variant="outline" onClick={() => setEditingField(null)}>Zrušit</Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {profile.bio || "Žádný popis nenastaven."}
          </p>
        )}
      </CardContent>
    </Card>
  );

  const servicesCard = (
    <Card className="rounded-2xl">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-foreground">Typy prací</span>
          <button onClick={() => navigate('/remeslnik/upravit-sluzby')}>
            <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
        
        {workerServices.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {Array.from(new Set(workerServices.map((s: any) => s.service_subcategories?.service_categories?.id)))
              .filter(Boolean)
              .map((categoryId) => {
                const firstService = workerServices.find((s: any) => s.service_subcategories?.service_categories?.id === categoryId);
                const category = firstService?.service_subcategories?.service_categories;
                const subcategories = workerServices.filter((s: any) => s.service_subcategories?.service_categories?.id === categoryId);
                const count = subcategories.length;
                
                if (!category) return null;
                
                const Icon = getIcon(category.icon);
                
                return (
                  <Popover key={categoryId as string}>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1 px-2 py-1 rounded-full border border-border bg-background hover:bg-muted transition-colors text-xs text-foreground">
                        <Icon className="h-3 w-3 text-muted-foreground" />
                        <span>{category.name}</span>
                        <span className="text-[10px] text-muted-foreground">({count})</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="start">
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground px-2 pb-1 border-b mb-1">
                          {category.name}
                        </p>
                        {subcategories.map((service: any) => (
                          <div key={service.id} className="px-2 py-1 text-xs text-foreground rounded hover:bg-muted">
                            {service.service_subcategories?.name}
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Žádné typy prací</p>
        )}
      </CardContent>
    </Card>
  );

  const portfolioCard = (
    <Card className="rounded-2xl">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-foreground">Fotky prací</span>
        </div>
        
        <div className="grid grid-cols-4 gap-1.5">
          {profile.portfolio_photos.slice(0, 3).map((photo, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              <img
                src={photo}
                alt={`Portfolio ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => handleRemovePortfolioPhoto(index)}
                className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground p-0.5 rounded-full"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
          
          {profile.portfolio_photos.length > 3 ? (
            <div className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/50">
              <span className="text-[10px] text-muted-foreground text-center px-1">
                Zobrazit<br />vše
              </span>
            </div>
          ) : profile.portfolio_photos.length < 8 && (
            <label className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'portfolio')}
                disabled={uploadingPortfolio}
              />
              <Upload className="h-4 w-4 text-muted-foreground" />
            </label>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-3">
      {/* Desktop Layout */}
      <div className="hidden md:grid md:grid-cols-[280px_1fr] gap-3">
        {/* Left Column */}
        <div className="space-y-3">
          {profileHeaderCard}
          {businessToggleCard}
          {contactCard}
          {googleMapsCard}
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          {bioCard}
          {servicesCard}
          {portfolioCard}

          <Button 
            onClick={() => handleSave()}
            className="w-full h-9 text-xs"
            disabled={saving}
          >
            {saving ? "Ukládám..." : "Uložit změny"}
          </Button>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden space-y-3">
        {profileHeaderCard}
        {businessToggleCard}
        {contactCard}
        {googleMapsCard}
        {bioCard}
        {servicesCard}
        {portfolioCard}

        <Button 
          onClick={() => handleSave()}
          className="w-full h-9 text-xs"
          disabled={saving}
        >
          {saving ? "Ukládám..." : "Uložit změny"}
        </Button>
      </div>

      {/* Completed Jobs Section */}
      {completedJobs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-foreground">Dokončené zakázky</h3>
            <span className="text-[10px] text-muted-foreground">Historie s hodnocením</span>
          </div>
          
          {completedJobs.map((review: any) => (
            <Card key={review.id} className="rounded-2xl">
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-foreground">
                      {review.jobs?.service_subcategories?.service_categories?.name} - {review.jobs?.service_subcategories?.name || review.jobs?.title}
                    </p>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${
                            star <= review.rating
                              ? 'fill-[hsl(75,70%,50%)] text-[hsl(75,70%,50%)]'
                              : 'text-muted-foreground/30'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.jobs?.final_price && (
                    <p className="text-xs font-semibold text-foreground whitespace-nowrap">
                      {review.jobs.final_price.toLocaleString('cs-CZ')} Kč
                    </p>
                  )}
                </div>
                
                {review.comment && (
                  <p className="text-[11px] text-muted-foreground italic mb-2">"{review.comment}"</p>
                )}

                {review.jobs?.completion_photos && review.jobs.completion_photos.length > 0 && (
                  <div className="flex gap-1.5 mt-1">
                    {review.jobs.completion_photos.slice(0, 4).map((photo: string, index: number) => (
                      <div
                        key={index}
                        className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0"
                      >
                        <img
                          src={photo}
                          alt={`Work ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Avatar Cropper Dialog */}
      <AvatarCropper
        open={avatarCropperOpen}
        onOpenChange={setAvatarCropperOpen}
        imageFile={pendingAvatarFile}
        onCropComplete={handleCroppedAvatar}
      />

      {/* Business Creation Dialog */}
      <Dialog open={showBusinessDialog} onOpenChange={setShowBusinessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Přidat firmu
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="biz-name" className="text-sm">Název firmy / Jméno</Label>
              <Input
                id="biz-name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Jan Novák"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biz-ico" className="text-sm">IČO</Label>
              <Input
                id="biz-ico"
                value={businessIco}
                onChange={(e) => setBusinessIco(e.target.value)}
                placeholder="12345678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biz-dic" className="text-sm">DIČ</Label>
              <Input
                id="biz-dic"
                value={businessDic}
                onChange={(e) => setBusinessDic(e.target.value)}
                placeholder="CZ12345678"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBusinessDialog(false)} disabled={creatingBusiness}>
              Zrušit
            </Button>
            <Button onClick={handleCreateBusiness} disabled={creatingBusiness}>
              {creatingBusiness ? "Vytvářím..." : "Vytvořit firmu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
