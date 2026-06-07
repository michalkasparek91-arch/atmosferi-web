import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight, Camera, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RecentRealizationsProps {
  categoryId: string;
  cityName: string;
  categoryName: string;
}

const RecentRealizations = ({ categoryId, cityName, categoryName }: RecentRealizationsProps) => {
  const { data: realizations, isLoading } = useQuery({
    queryKey: ["recent-realizations", categoryId, cityName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          id, 
          title, 
          final_price, 
          completion_photos, 
          city,
          profiles!jobs_customer_id_fkey (
            full_name
          )
        `)
        .eq("status", "completed")
        .eq("category_id", categoryId)
        .eq("city", cityName)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      return data || [];
    },
    enabled: !!categoryId && !!cityName,
  });

  if (!isLoading && (!realizations || realizations.length === 0)) {
    return null;
  }

  const formatName = (fullName: string | null) => {
    if (!fullName) return "Zákazník";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length < 2) return fullName;
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
  };

  return (
    <section className="mt-16 overflow-hidden">
      <div className="flex items-center justify-between mb-8 px-1">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-primary" strokeWidth={1.75} />
            Nedávné realizace v lokalitě {cityName}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Podívejte se na skutečné zakázky pro obor {categoryName}, které naši profíci dokončili.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {realizations.map((job: any) => (
            <Card key={job.id} className="group overflow-hidden rounded-3xl border border-border/60 bg-card transition-all hover:border-primary/30">
              <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                {job.completion_photos && job.completion_photos.length > 0 ? (
                  <img
                    src={job.completion_photos[0]}
                    alt={job.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground/40 space-y-2">
                    <Camera className="h-10 w-10" strokeWidth={1} />
                    <span className="text-[10px] uppercase font-bold tracking-widest">Bez fotografie</span>
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <Badge className="bg-background/90 backdrop-blur-sm text-foreground hover:bg-background/90 border-0 rounded-full font-bold uppercase text-[10px] tracking-wider px-3">
                    Hotovo
                  </Badge>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors h-10">
                      {job.title}
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-2 py-3 border-y border-border/40">
                    <div className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-foreground">
                      <User className="h-4 w-4" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Zákazník</p>
                      <p className="text-xs font-bold text-foreground">{formatName(job.profiles?.full_name)}</p>
                    </div>
                    {job.final_price && (
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Cena</p>
                        <p className="text-xs font-black text-primary">{job.final_price.toLocaleString('cs-CZ')} Kč</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-muted-foreground text-[11px] font-medium uppercase tracking-tight">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                      <span>Ověřeno Zrobee</span>
                    </div>
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};

export default RecentRealizations;
