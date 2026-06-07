import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Star, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export default function Widget() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [reviewStats, setReviewStats] = useState({ count: 0, avg: 0 });

  useEffect(() => {
    // Add a class to the body to hide any global styles if necessary
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';
    
    if (!slug) {
      setError(true);
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const { data: prof, error: profErr } = await supabase
          .from("unified_public_profiles")
          .select("*")
          .eq("slug", slug)
          .single();

        if (profErr || !prof) throw new Error("Profile not found");
        setProfile(prof);

        const { data: reviews } = await supabase
          .from("reviews")
          .select("rating")
          .eq("reviewee_id", prof.id);

        let count = 0;
        let avg = 0;
        if (reviews && reviews.length > 0) {
          count = reviews.length;
          avg = reviews.reduce((sum, r) => sum + r.rating, 0) / count;
        }

        setReviewStats({ count, avg });
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-4 bg-background rounded-xl border border-border w-full max-w-sm font-sans shadow-sm">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-4 bg-background rounded-xl border border-border w-full max-w-sm text-sm text-muted-foreground font-sans text-center shadow-sm">
        Profil nenalezen
      </div>
    );
  }

  const isGoogleRating = reviewStats.count === 0 && profile.google_rating != null;
  const ratingValue = reviewStats.count > 0 ? reviewStats.avg.toFixed(1) : (profile.google_rating ? Number(profile.google_rating).toFixed(1) : null);
  const reviewCount = reviewStats.count > 0 ? reviewStats.count : (profile.google_reviews_count || 0);

  const getFirstName = () => profile.full_name?.split(" ")[0] || "Řemeslník";
  
  // Create the CTA URL with UTM parameters
  const profileUrl = `https://zrobee.cz/remeslnik/${slug}?utm_source=widget&utm_medium=embed&utm_campaign=worker_widget`;

  return (
    <div className="flex flex-col bg-card rounded-xl border border-border/60 shadow-sm w-[300px] overflow-hidden font-sans transition-all hover:shadow-md hover:border-border">
      <div className="p-3 pb-2 flex items-start gap-3 relative">
        <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-sm">
          <AvatarImage src={profile.avatar_url || ""} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold">
            {getFirstName()[0]}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-[15px] text-foreground truncate leading-tight">
              {getFirstName()}
            </h3>
            {profile.is_verified && (
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
            )}
          </div>
          
          <p className="text-[11px] text-muted-foreground truncate mb-1.5">
            {profile.company_type === 'company' ? 'Firma (s.r.o.)' : profile.company_type || 'Řemeslník'} {profile.city ? `• ${profile.city}` : ''}
          </p>

          <div className="flex items-center flex-wrap gap-1.5 h-5">
            {ratingValue ? (
              <>
                <span className="flex items-center gap-0.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded text-[11px] font-bold">
                  {ratingValue} <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                </span>
                <span className="text-[10px] text-muted-foreground">
                  ({reviewCount})
                </span>
                {isGoogleRating && (
                  <img src="https://www.gstatic.com/images/branding/product/1x/maps_512dp.png" alt="Google Maps" className="w-3 h-3 opacity-80 ml-0.5" />
                )}
              </>
            ) : (
              <span className="text-[11px] font-medium text-muted-foreground">Nový na platformě</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-muted/40 px-3 py-2.5 border-t border-border/40">
        <a 
          href={profileUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold py-1.5 rounded-lg transition-colors"
        >
          Poptejte mě přes Zrobee
        </a>
      </div>
    </div>
  );
}
