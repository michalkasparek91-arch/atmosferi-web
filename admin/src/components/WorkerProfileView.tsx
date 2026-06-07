import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, Pencil, X, Clock, MessageCircle, Sparkles, Award, ArrowLeft, ChevronRight, Zap, ShieldCheck, Building2, Phone as PhoneIcon } from "lucide-react";
import * as Icons from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface WorkerProfileViewProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const WorkerProfileView = ({ open = true, onOpenChange }: WorkerProfileViewProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    bio: "",
    company_type: "",
    city: "",
    region: "",
    country: "",
    avatar_url: "",
    header_url: "",
    portfolio_photos: [] as string[],
    phone_verified: false,
    is_pro: false
  });
  const [workerServices, setWorkerServices] = useState<any[]>([]);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [verification, setVerification] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [
        { data: profileData },
        { data: servicesData },
        { data: reviewsData },
        { data: verificationData }
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single(),
        supabase
          .from('worker_services')
          .select('*, service_subcategories(*, service_categories(*))')
          .eq('worker_id', session.user.id),
        supabase
          .from('reviews')
          .select('*, jobs(title, completion_photos, final_price, subcategory_id, service_subcategories:subcategory_id(name, service_categories(name)))')
          .eq('reviewee_id', session.user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('worker_verifications')
          .select('status')
          .eq('worker_id', session.user.id)
          .single()
      ]);

      if (profileData) {
        const displayCompanyType = profileData.company_type === 'self_employed' ? 'OSVČ' : 
                                   profileData.company_type === 'company' ? 'Firma (s.r.o.)' : 
                                   profileData.company_type || '';
        
        setProfile({
          full_name: profileData.full_name || "",
          email: profileData.email || "",
          phone: profileData.phone || "",
          bio: profileData.bio || "",
          company_type: displayCompanyType,
          city: profileData.city || "",
          region: profileData.region || "",
          country: profileData.country || "Česká republika",
          avatar_url: profileData.avatar_url || "",
          header_url: profileData.header_url || "",
          portfolio_photos: profileData.portfolio_photos || [],
          phone_verified: profileData.phone_verified || false,
          is_pro: profileData.is_pro || false
        });
      }

      if (servicesData && servicesData.length > 0) {
        setWorkerServices(servicesData);
      }

      if (reviewsData) {
        setCompletedJobs(reviewsData);
      }

      setVerification(verificationData);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
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

  const calcMedian = (arr: number[]) => {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const punctualityRatings = completedJobs.map(j => j.quality_punctuality).filter(Boolean);
  const communicationRatings = completedJobs.map(j => j.quality_communication).filter(Boolean);
  const cleanlinessRatings = completedJobs.map(j => j.quality_cleanliness).filter(Boolean);
  const professionalismRatings = completedJobs.map(j => j.quality_professionalism).filter(Boolean);
  const overallRatings = completedJobs.map(j => j.rating).filter(Boolean);

  const qualityStats = [
    { key: 'punctuality', label: 'Dochvilnost', icon: <Clock className="h-3 w-3" />, median: calcMedian(punctualityRatings) },
    { key: 'communication', label: 'Komunikace', icon: <MessageCircle className="h-3 w-3" />, median: calcMedian(communicationRatings) },
    { key: 'cleanliness', label: 'Čistota', icon: <Sparkles className="h-3 w-3" />, median: calcMedian(cleanlinessRatings) },
    { key: 'professionalism', label: 'Profesionalita', icon: <Award className="h-3 w-3" />, median: calcMedian(professionalismRatings) },
  ];

  const hasQualityRatings = qualityStats.some(q => q.median !== null);
  const medianRating = calcMedian(overallRatings)?.toFixed(1) || null;

  // Build achievement badges based on actual data
  const isVerified = verification?.status === 'verified';
  const isPhoneVerified = profile.phone_verified;

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-14 w-14 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            <div className="h-3 w-24 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="h-20 bg-muted animate-pulse rounded-xl" />
        <div className="flex gap-2">
          <div className="h-16 w-16 bg-muted animate-pulse rounded-xl" />
          <div className="h-16 w-16 bg-muted animate-pulse rounded-xl" />
          <div className="h-16 w-16 bg-muted animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  const frontCard = (
    <Card className="overflow-hidden relative shadow-2xl rounded-3xl border-0 bg-[hsl(var(--list-item-header))] h-[80vh] flex flex-col">
      <CardContent className="p-4 space-y-3 flex-1 overflow-y-auto pt-4 overscroll-contain scrollbar-none">
        {/* Header: Avatar + Name + Rating + Location */}
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <Avatar className="h-14 w-14 border-2 border-primary/30">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="text-base bg-muted text-muted-foreground">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            {profile.is_pro && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[8px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                PRO
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-[hsl(var(--dark-green))]">{profile.full_name || "Jméno"}</h2>
              {medianRating && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                  {medianRating} <Star className="h-2.5 w-2.5 fill-current" />
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-[10px] text-[hsl(var(--dark-green))/0.7]">
              <MapPin className="h-3 w-3 text-[hsl(var(--dark-green))] flex-shrink-0" />
              <span>{profile.city && profile.country ? `${profile.city}, ${profile.country}` : "Umístění nenastaveno"}</span>
            </div>
            
            {profile.company_type && (
              <div className="flex items-center gap-1 text-[10px] text-[hsl(var(--dark-green))/0.7]">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span>{profile.company_type}</span>
              </div>
            )}
          </div>
        </div>

        {/* Services / Categories */}
        {workerServices.length > 0 && (
          <div className="flex flex-wrap gap-1">
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
                  <button className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-[hsl(var(--dark-green))/0.2] bg-white/40 text-[10px] hover:bg-white/60 transition-colors text-[hsl(var(--dark-green))]">
                        <Icon className="h-2.5 w-2.5 text-[hsl(var(--dark-green))/0.6]" />
                        <span>{category.name}</span>
                        <span className="text-[hsl(var(--dark-green))/0.4]">({count})</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="start">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground px-2 pb-1 border-b mb-1">
                          {category.name}
                        </p>
                        {subcategories.map((service: any) => (
                          <div key={service.id} className="px-2 py-1 text-xs rounded hover:bg-muted">
                            {service.service_subcategories?.name}
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })}
          </div>
        )}

        {/* Achievement Badges - circular design */}
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          {isVerified && (
            <div className="flex flex-col items-center gap-1 group cursor-default">
              <div className="w-10 h-10 rounded-full bg-[hsl(var(--dark-green))] flex items-center justify-center shadow-md transition-transform hover:scale-110">
                <ShieldCheck className="h-5 w-5 text-[hsl(var(--list-item-header))]" />
              </div>
              <span className="text-[8px] font-bold text-[hsl(var(--dark-green))/0.6] uppercase tracking-tighter whitespace-nowrap">Ověřeno</span>
            </div>
          )}
          
          {isPhoneVerified && (
            <div className="flex flex-col items-center gap-1 group cursor-default">
              <div className="w-10 h-10 rounded-full bg-[hsl(var(--dark-green))] flex items-center justify-center shadow-md transition-transform hover:scale-110">
                <PhoneIcon className="h-5 w-5 text-[hsl(var(--list-item-header))]" />
              </div>
              <span className="text-[8px] font-bold text-[hsl(var(--dark-green))/0.6] uppercase tracking-tighter whitespace-nowrap">Mobil</span>
            </div>
          )}

          {medianRating && Number(medianRating) >= 4.5 && (
            <div className="flex flex-col items-center gap-1 group cursor-default">
              <div className="w-10 h-10 rounded-full bg-[hsl(var(--dark-green))] flex items-center justify-center shadow-md transition-transform hover:scale-110">
                <Star className="h-5 w-5 text-[hsl(var(--list-item-header))]" />
              </div>
              <span className="text-[8px] font-bold text-[hsl(var(--dark-green))/0.6] uppercase tracking-tighter whitespace-nowrap">TOP</span>
            </div>
          )}

          {completedJobs.length >= 10 && (
            <div className="flex flex-col items-center gap-1 group cursor-default">
              <div className="w-10 h-10 rounded-full bg-[hsl(var(--dark-green))] flex items-center justify-center shadow-md transition-transform hover:scale-110">
                <Award className="h-5 w-5 text-[hsl(var(--list-item-header))]" />
              </div>
              <span className="text-[8px] font-bold text-[hsl(var(--dark-green))/0.6] uppercase tracking-tighter whitespace-nowrap">Expert</span>
            </div>
          )}

          {completedJobs.length >= 1 && completedJobs.length < 10 && medianRating && Number(medianRating) >= 4.0 && (
            <div className="flex flex-col items-center gap-1 group cursor-default">
              <div className="w-10 h-10 rounded-full bg-[hsl(var(--dark-green))] flex items-center justify-center shadow-md transition-transform hover:scale-110">
                <Zap className="h-5 w-5 text-[hsl(var(--list-item-header))]" />
              </div>
              <span className="text-[8px] font-bold text-[hsl(var(--dark-green))/0.6] uppercase tracking-tighter whitespace-nowrap">Hvězda</span>
            </div>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-xs text-[hsl(var(--dark-green))/0.8] leading-relaxed py-3">
            {profile.bio}
          </p>
        )}

        {/* Portfolio Photos */}
        {profile.portfolio_photos.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {profile.portfolio_photos.map((photo, index) => (
              <button
                key={index}
                onClick={() => {
                  setLightboxIndex(index);
                  setLightboxOpen(true);
                }}
                className="w-16 h-16 rounded-xl overflow-hidden bg-white/50 flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer border border-[hsl(var(--dark-green))/0.1]"
              >
                <img
                  src={photo}
                  alt={`Portfolio ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Quality Ratings */}
        {hasQualityRatings && (
          <div className="grid grid-cols-2 gap-1.5">
            {qualityStats.map((q) => (
              q.median !== null && (
                <div key={q.key} className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white/50 border border-[hsl(var(--dark-green))/0.1] text-[10px]">
                  <div className="flex items-center gap-1 text-[hsl(var(--dark-green))/0.7]">
                    {q.icon}
                    <span>{q.label}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <span className="font-semibold text-[hsl(var(--dark-green))]">{q.median.toFixed(1)}</span>
                    <Star className="h-2.5 w-2.5 fill-primary text-primary" />
                  </div>
                </div>
              )
            ))}
          </div>
        )}

      </CardContent>

      <div className="p-4 pt-0">
        <button
          onClick={() => completedJobs.length > 0 ? setIsFlipped(true) : undefined}
          className={`w-full flex items-center justify-between p-3 rounded-xl transition-all shadow-md ${
            completedJobs.length > 0 
              ? 'bg-[hsl(var(--dark-green))] hover:bg-[hsl(var(--dark-green))]/90 cursor-pointer text-[hsl(var(--list-item-header))]' 
              : 'bg-white/40 cursor-default text-[hsl(var(--dark-green))/0.4]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Star className={`h-3.5 w-3.5 ${completedJobs.length > 0 ? 'fill-current text-primary' : 'text-gray-400'}`} />
            <span className={`text-xs font-semibold`}>
              {completedJobs.length > 0 ? 'Dokončené zakázky' : 'Pojďte pro první recenzi'}
            </span>
            {completedJobs.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold text-[hsl(var(--list-item-header))]">{completedJobs.length}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {medianRating && completedJobs.length > 0 && (
              <span className="text-xs font-bold text-[hsl(var(--list-item-header))] mr-1">{medianRating} ★</span>
            )}
            {completedJobs.length > 0 && <ChevronRight className="h-4 w-4 text-[hsl(var(--list-item-header))]" />}
          </div>
        </button>
      </div>
    </Card>
  );

  const backCard = (
    <Card className="overflow-hidden relative shadow-2xl rounded-3xl border-0 bg-[hsl(var(--list-item-header))] h-[80vh] flex flex-col">
      <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-none">
        <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setIsFlipped(false)}
            className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--dark-green))] hover:opacity-80 transition-opacity rounded-full px-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Recenze</span>
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="text-4xl font-bold text-[hsl(var(--dark-green))]">{medianRating || "5.0"}</div>
            <div className="flex items-center gap-0.5 mt-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3.5 w-3.5 ${
                    star <= Math.round(Number(medianRating) || 5)
                      ? 'fill-primary text-primary'
                      : 'text-gray-400'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-[hsl(var(--dark-green))/0.6] mt-1">Celkem {completedJobs.length} hodnocení</p>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase">
            Ověřený Expert
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {completedJobs.map((review: any) => (
          <div key={review.id} className="p-3 rounded-2xl bg-white/60 border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary/20 text-[hsl(var(--dark-green))]">
                    {review.jobs?.title?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-semibold text-[hsl(var(--dark-green))]">
                    {review.jobs?.service_subcategories?.name || "Zákazník"}
                  </p>
                  <p className="text-[10px] text-[hsl(var(--dark-green))/0.5]">
                    {new Date(review.created_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                {review.rating.toFixed(1)} <Star className="h-2.5 w-2.5 fill-current" />
              </span>
            </div>
            
            {review.comment && (
              <p className="text-xs text-[hsl(var(--dark-green))/0.8] mb-2">{review.comment}</p>
            )}

            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {review.quality_punctuality && (
                <div className="flex items-center justify-between text-[9px] text-[hsl(var(--dark-green))/0.7]">
                  <span className="uppercase">Dochvilnost</span>
                  <span className="font-semibold text-[hsl(var(--dark-green))]">{review.quality_punctuality.toFixed(1)}</span>
                </div>
              )}
              {review.quality_communication && (
                <div className="flex items-center justify-between text-[9px] text-[hsl(var(--dark-green))/0.7]">
                  <span className="uppercase">Komunikace</span>
                  <span className="font-semibold text-[hsl(var(--dark-green))]">{review.quality_communication.toFixed(1)}</span>
                </div>
              )}
              {review.quality_cleanliness && (
                <div className="flex items-center justify-between text-[9px] text-[hsl(var(--dark-green))/0.7]">
                  <span className="uppercase">Čistota</span>
                  <span className="font-semibold text-[hsl(var(--dark-green))]">{review.quality_cleanliness.toFixed(1)}</span>
                </div>
              )}
              {review.quality_professionalism && (
                <div className="flex items-center justify-between text-[9px] text-[hsl(var(--dark-green))/0.7]">
                  <span className="uppercase">Odbornost</span>
                  <span className="font-semibold text-[hsl(var(--dark-green))]">{review.quality_professionalism.toFixed(1)}</span>
                </div>
              )}
            </div>

            {review.jobs?.completion_photos && review.jobs.completion_photos.length > 0 && (
              <div className="flex gap-1.5">
                {review.jobs.completion_photos.slice(0, 4).map((photo: string, index: number) => (
                  <div
                    key={index}
                    className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0 relative"
                  >
                    <img
                      src={photo}
                      alt={`Completion ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {index === 3 && review.jobs.completion_photos.length > 4 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold">
                        +{review.jobs.completion_photos.length - 4}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>

      <div className="p-4 pt-0">
        <Button
          onClick={() => setIsFlipped(false)}
          className="w-full h-11 rounded-full bg-[hsl(var(--dark-green))] text-[hsl(var(--list-item-header))] hover:bg-[hsl(var(--dark-green))]/90 shadow-md font-semibold"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zpět na profil
        </Button>
      </div>
    </Card>
  );

  const cardContent = (
    <>
      {/* Photo Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-3xl p-0 bg-black/95 border-none">
          <button 
            onClick={() => setLightboxOpen(false)}
            className="absolute top-2 right-2 z-50 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <div className="relative flex items-center justify-center min-h-[60vh]">
            {profile.portfolio_photos.length > 1 && (
              <button
                onClick={() => setLightboxIndex((prev) => (prev === 0 ? profile.portfolio_photos.length - 1 : prev - 1))}
                className="absolute left-2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
            )}
            
            <img
              src={profile.portfolio_photos[lightboxIndex]}
              alt={`Portfolio ${lightboxIndex + 1}`}
              className="max-h-[80vh] max-w-full object-contain"
            />
            
            {profile.portfolio_photos.length > 1 && (
              <button
                onClick={() => setLightboxIndex((prev) => (prev === profile.portfolio_photos.length - 1 ? 0 : prev + 1))}
                className="absolute right-2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-white" />
              </button>
            )}
          </div>
          
          <div className="flex gap-2 p-3 justify-center overflow-x-auto">
            {profile.portfolio_photos.map((photo, index) => (
              <button
                key={index}
                onClick={() => setLightboxIndex(index)}
                className={`w-12 h-12 rounded overflow-hidden flex-shrink-0 transition-opacity ${
                  index === lightboxIndex ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-75'
                }`}
              >
                <img src={photo} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Flip container */}
      <div className="relative w-full" style={{ perspective: '1000px' }}>
        <div
          className="relative w-full transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          <div
            className="w-full"
            style={{
              backfaceVisibility: 'hidden',
              display: isFlipped ? 'none' : 'block',
            }}
          >
            {frontCard}
          </div>

          <div
            className="w-full"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              display: isFlipped ? 'block' : 'none',
            }}
          >
            {backCard}
          </div>
        </div>
      </div>

      {/* Edit Profile Button */}
      <div className="flex justify-center mt-3">
        <Button 
          onClick={() => navigate('/remeslnik/profil/upravit')}
          className="h-10 px-6 rounded-full bg-white/40 border border-[hsl(var(--dark-green))/0.2] text-[hsl(var(--dark-green))/0.8] hover:bg-white/60 hover:text-[hsl(var(--dark-green))]"
          variant="outline"
        >
          <Pencil className="h-3.5 w-3.5 mr-2" />
          Upravit profil
        </Button>
      </div>
    </>
  );

  // If onOpenChange is provided, render as a dialog popup - only ONE close button (outside the card)
  if (onOpenChange) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm p-0 bg-transparent border-none shadow-none overflow-visible [&>button]:hidden">
          <button 
            onClick={() => onOpenChange(false)}
            className="absolute -top-3 -right-3 z-[60] w-8 h-8 flex items-center justify-center rounded-full bg-[hsl(var(--dark-green))] hover:bg-[hsl(var(--dark-green))]/90 transition-colors shadow-lg"
          >
            <X className="h-4 w-4 text-white" />
          </button>
          <div className="p-4">
          {cardContent}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="max-w-sm mx-auto">
      {cardContent}
    </div>
  );
};
