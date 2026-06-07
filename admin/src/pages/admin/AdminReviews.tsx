import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Eye, EyeOff, Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminReviews() {
  const queryClient = useQueryClient();
  const [filterRating, setFilterRating] = useState("all");
  const [filterHidden, setFilterHidden] = useState("all");

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-reviews", filterRating, filterHidden],
    queryFn: async () => {
      let query = supabase
        .from("reviews")
        .select("*, reviewer:public_profiles!reviews_reviewer_id_fkey(full_name), reviewee:public_profiles!reviews_reviewee_id_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(200);

      if (filterRating !== "all") {
        query = query.eq("rating", parseInt(filterRating));
      }
      if (filterHidden === "hidden") {
        query = query.eq("is_hidden", true);
      } else if (filterHidden === "visible") {
        query = query.eq("is_hidden", false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const toggleHidden = useMutation({
    mutationFn: async ({ id, is_hidden }: { id: string; is_hidden: boolean }) => {
      const { error } = await supabase.from("reviews").update({ is_hidden }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { is_hidden }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success(is_hidden ? "Recenze skryta" : "Recenze zobrazena");
    },
    onError: () => toast.error("Chyba při aktualizaci recenze"),
  });

  function renderStars(rating: number) {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} className={`h-3.5 w-3.5 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Star}
        title="Recenze"
        subtitle="Správa hodnocení a zpětné vazby"
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterRating} onValueChange={setFilterRating}>
          <SelectTrigger className="w-[160px] h-8 text-[10px] font-medium bg-muted/40 border-border rounded-full focus:ring-1 focus:ring-primary/20 transition-all">
            <SelectValue placeholder="Hodnocení" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[10px] font-medium">Všechna hodnocení</SelectItem>
            {[1, 2, 3, 4, 5].map(r => (
              <SelectItem key={r} value={String(r)} className="text-[10px] font-medium">{r} ★</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterHidden} onValueChange={setFilterHidden}>
          <SelectTrigger className="w-[160px] h-8 text-[10px] font-medium bg-muted/40 border-border/60 rounded-full focus:ring-1 focus:ring-primary/20 transition-all">
            <SelectValue placeholder="Stav" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[10px] font-medium">Všechny</SelectItem>
            <SelectItem value="visible" className="text-[10px] font-medium">Viditelné</SelectItem>
            <SelectItem value="hidden" className="text-[10px] font-medium">Skryté</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !reviews?.length ? (
        <Card className="rounded-xl">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Star className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Žádné recenze</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review: any) => (
            <Card key={review.id} className={`rounded-xl shadow-sm transition-all ${review.is_hidden ? "opacity-60 border-dashed" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {renderStars(review.rating)}
                      {review.is_hidden && (
                        <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 border-red-500/20 shadow-none">Skrytá</Badge>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-foreground">
                      <span className="opacity-60 font-medium">Od:</span> {review.reviewer?.full_name || "Neznámý"} 
                      <span className="mx-2 opacity-30 tracking-widest">→</span> 
                      <span className="opacity-60 font-medium">Pro:</span> {review.reviewee?.full_name || "Neznámý"}
                    </p>
                    {review.comment && (
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{review.comment}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1 opacity-60">
                      {format(new Date(review.created_at), "d. M. yyyy", { locale: cs })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 h-8 rounded-full text-[10px] font-medium hover:bg-muted/60 active:scale-95 transition-all"
                    onClick={() => toggleHidden.mutate({ id: review.id, is_hidden: !review.is_hidden })}
                  >
                    {review.is_hidden ? <Eye className="h-3.5 w-3.5 mr-1.5 opacity-60" /> : <EyeOff className="h-3.5 w-3.5 mr-1.5 opacity-60" />}
                    {review.is_hidden ? "Zobrazit" : "Skrýt"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
