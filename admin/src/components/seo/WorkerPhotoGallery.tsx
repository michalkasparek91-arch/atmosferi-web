import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Camera, CheckCircle2, MapPin, ZoomIn, X, Shield, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface PhotoItem {
  id: string;
  url: string;
  title: string;
  workerName?: string;
  location: string;
  badgeText: string;
}

interface WorkerPhotoGalleryProps {
  categoryId?: string | null;
  cityName: string;
  categoryName: string;
}

const WorkerPhotoGallery = ({ categoryId, cityName, categoryName }: WorkerPhotoGalleryProps) => {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

  const { data: photos, isLoading } = useQuery({
    queryKey: ["worker-photo-gallery", categoryId, cityName],
    queryFn: async () => {
      const items: PhotoItem[] = [];

      // 1. Fetch completed jobs with photos in this city
      let jobQuery = supabase
        .from("jobs")
        .select(`
          id, title, completion_photos, city,
          profiles!jobs_worker_id_fkey ( full_name )
        `)
        .eq("status", "completed")
        .ilike("city", `%${cityName}%`)
        .not("completion_photos", "is", null)
        .order("created_at", { ascending: false })
        .limit(6);

      if (categoryId) {
        jobQuery = jobQuery.eq("category_id", categoryId);
      }

      const { data: jobData } = await jobQuery;

      for (const job of jobData || []) {
        if (job.completion_photos && job.completion_photos.length > 0) {
          items.push({
            id: `job-${job.id}`,
            url: job.completion_photos[0],
            title: job.title || `Realizace zakázky (${categoryName})`,
            workerName: (job.profiles as any)?.full_name || "Ověřený řemeslník",
            location: job.city || cityName,
            badgeText: "Dokončená zakázka"
          });
        }
      }

      // 2. If we need more photos, fetch worker profile avatars / portfolio samples in this city
      if (items.length < 6) {
        let profileQuery = supabase
          .from("public_profiles")
          .select("id, full_name, avatar_url, city")
          .ilike("city", `%${cityName}%`)
          .not("avatar_url", "is", null)
          .limit(6 - items.length);

        const { data: profileData } = await profileQuery;

        for (const prof of profileData || []) {
          if (prof.avatar_url) {
            items.push({
              id: `prof-${prof.id}`,
              url: prof.avatar_url,
              title: `Profil odborníka: ${prof.full_name || "Řemeslník"}`,
              workerName: prof.full_name || "Ověřený odborník",
              location: prof.city || cityName,
              badgeText: "Ověřený profil"
            });
          }
        }
      }

      return items;
    },
    enabled: !!cityName,
  });

  if (!isLoading && (!photos || photos.length === 0)) {
    return null;
  }

  return (
    <section className="mt-16 my-12" aria-labelledby="gallery-heading">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-emerald-50 text-emerald-600 border-none rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              100% Reálné ukázky
            </Badge>
          </div>
          <h2 id="gallery-heading" className="text-3xl font-extrablack uppercase tracking-tight text-foreground md:text-4xl flex items-center gap-3">
            <Camera className="h-8 w-8 text-primary" strokeWidth={2} />
            Ukázky práce {cityName ? `v lokalitě ${cityName}` : ""}
          </h2>
          <p className="mt-1 text-muted-foreground text-sm md:text-base max-w-xl leading-relaxed">
            Prohlédněte si skutečné realizace a profily odborníků pro obor <strong className="text-foreground">{categoryName}</strong>.
          </p>
        </div>
        <div className="hidden lg:block text-right">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">Lokalita</span>
          <span className="text-sm font-black text-foreground flex items-center gap-1 justify-end">
            <MapPin className="h-4 w-4 text-primary" /> {cityName || "ČR"}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {photos?.map((photo) => (
            <div
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="group relative aspect-[4/3] rounded-3xl overflow-hidden bg-muted cursor-pointer border border-border/60 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <img
                src={photo.url}
                alt={photo.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-6">
                <div className="flex items-center justify-between">
                  <Badge className="bg-background/90 backdrop-blur-md text-foreground border-none rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    {photo.badgeText}
                  </Badge>
                  <div className="h-8 w-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-white font-bold text-base leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                    {photo.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 text-white/80 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="font-medium truncate">{photo.workerName}</span>
                    <span className="text-white/40">•</span>
                    <span className="text-white/60 truncate">{photo.location}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Viewer */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-6 right-6 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-[2.5rem] bg-zinc-900 border border-white/10 flex flex-col">
            <div className="relative flex-1 overflow-hidden min-h-[50vh] flex items-center justify-center bg-black/50">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.title}
                className="max-h-[70vh] max-w-full object-contain"
              />
            </div>
            <div className="p-6 bg-zinc-900/90 border-t border-white/10 flex items-center justify-between text-white">
              <div>
                <Badge className="bg-primary/20 text-primary border-none rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest mb-2 block w-fit">
                  {selectedPhoto.badgeText}
                </Badge>
                <h4 className="font-bold text-lg">{selectedPhoto.title}</h4>
                <p className="text-xs text-white/60 mt-1 flex items-center gap-2">
                  <span>Odborník: <strong className="text-white">{selectedPhoto.workerName}</strong></span>
                  <span>•</span>
                  <span>Lokalita: <strong className="text-white">{selectedPhoto.location}</strong></span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Ověřeno Zrobee</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default WorkerPhotoGallery;
