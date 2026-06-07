import { useState, useEffect } from "react";
import AcceptOfferConfirmDialog from "@/components/AcceptOfferConfirmDialog";
import EmptyState from "@/components/EmptyState";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Phone, MessageSquare, User, ChevronLeft, Star, Calendar, Coins, CheckCircle } from "lucide-react";
import { acceptOffer } from "@/lib/offer-actions";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { ProBadge } from "@/components/worker-badges/ProBadge";
import { PublicWorkerProfileCard } from "@/components/PublicWorkerProfileCard";
import { useHistoryState } from "@/hooks/use-history-state";

interface JobOffersDialogProps {
  jobId: string;
  customerId: string;
  subcategoryName?: string;
  isOpen: boolean;
  onClose: () => void;
  onOfferAccepted: () => void;
}

const JobOffersDialog = ({ jobId, customerId, subcategoryName, isOpen, onClose, onOfferAccepted }: JobOffersDialogProps) => {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [confirmingOffer, setConfirmingOffer] = useState<any>(null);
  const [accepting, setAccepting] = useState(false);
  const navigate = useNavigate();

  // Sync with browser history for native back button support
  useHistoryState(isOpen && !selectedOffer, onClose, "job-offers-list");
  useHistoryState(!!selectedOffer && !selectedWorkerId, () => setSelectedOffer(null), "job-offer-detail");

  useEffect(() => {
    if (isOpen && jobId) {
      loadOffers();
    }
  }, [isOpen, jobId]);

  const loadOffers = async () => {
    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        profiles:worker_id(full_name, bio, is_pro, pro_expires_at)
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      const sorted = [...data].sort((a, b) => {
        const aIsPro = a.profiles?.is_pro && (!a.profiles?.pro_expires_at || new Date(a.profiles.pro_expires_at) > new Date());
        const bIsPro = b.profiles?.is_pro && (!b.profiles?.pro_expires_at || new Date(b.profiles.pro_expires_at) > new Date());
        if (aIsPro && !bIsPro) return -1;
        if (!aIsPro && bIsPro) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setOffers(sorted);
    }
    setLoading(false);
  };

  const handleConfirmAccept = async () => {
    if (!confirmingOffer) return;
    
    setAccepting(true);
    const result = await acceptOffer({
      offerId: confirmingOffer.id,
      jobId,
      customerId,
      workerId: confirmingOffer.worker_id,
      subcategoryName,
      offerAvailability: confirmingOffer.availability
    });

    setAccepting(false);
    
    if (result.success) {
      toast({
        title: "Úspěch!",
        description: "Nabídka byla přijata",
      });
      setConfirmingOffer(null);
      setSelectedOffer(null);
      onOfferAccepted();
      onClose();
    } else {
      toast({
        title: "Chyba",
        description: result.error || "Nepodařilo se přijmout nabídku",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      accepted: "default",
      rejected: "destructive",
    };
    
    const labels: Record<string, string> = {
      pending: "Čeká",
      accepted: "Přijato",
      rejected: "Odmítnuto",
    };

    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  return (
    <>
      {/* Offers List Dialog */}
      <Dialog open={isOpen && !selectedOffer} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] max-md:h-full max-md:max-h-full max-md:w-full max-md:max-w-full max-md:rounded-none max-md:border-0">
          <DialogHeader>
            <DialogTitle>Nabídky pracovníků</DialogTitle>
          </DialogHeader>
          <div className="max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center">Načítání...</div>
            ) : offers.length === 0 ? (
              <EmptyState message="Zatím nemáte žádné nabídky" />
            ) : (
              <div className="space-y-3">
                {offers.map((offer) => (
                  <Card 
                    key={offer.id} 
                    className="cursor-pointer hover:bg-accent/30 transition-colors"
                    onClick={() => setSelectedOffer(offer)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">
                              {offer.profiles?.full_name || "Jméno není k dispozici"}
                            </CardTitle>
                            {offer.profiles?.is_pro && 
                              (!offer.profiles?.pro_expires_at || new Date(offer.profiles.pro_expires_at) > new Date()) && (
                              <ProBadge variant="small" />
                            )}
                          </div>
                          <div className="text-xl font-bold mt-1">{offer.price.toLocaleString()} Kč</div>
                          {offer.created_at && (
                            <div className="text-[10px] text-muted-foreground mt-1">
                              vytvořeno {format(new Date(offer.created_at), "d. M. yyyy", { locale: cs })}
                            </div>
                          )}
                        </div>
                        {getStatusBadge(offer.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {offer.message}
                      </p>
                      {offer.photos && offer.photos.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {offer.photos.slice(0, 4).map((photo: string, index: number) => (
                            <div
                              key={index}
                              className="h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted"
                            >
                              <img
                                src={photo}
                                alt={`Příloha ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                          {offer.photos.length > 4 && (
                            <div className="h-16 w-16 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground">
                              +{offer.photos.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Offer Detail Dialog */}
      <Dialog open={!!selectedOffer && !selectedWorkerId} onOpenChange={() => setSelectedOffer(null)}>
        <DialogContent className="sm:max-w-[600px] max-md:h-full max-md:max-h-full max-md:w-full max-md:max-w-full max-md:rounded-none max-md:border-0">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedOffer(null)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <DialogTitle>Detail nabídky</DialogTitle>
            </div>
          </DialogHeader>
          {selectedOffer && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold">
                    {selectedOffer.profiles?.full_name || "Jméno není k dispozici"}
                  </h3>
                  {selectedOffer.profiles?.bio && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedOffer.profiles.bio}
                    </p>
                  )}
                </div>
                {getStatusBadge(selectedOffer.status)}
              </div>

              <div className="space-y-4 pt-4">
                <div>
                  <div className="text-sm font-semibold mb-1">Navržená cena</div>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">{selectedOffer.price.toLocaleString()} Kč</div>
                    {selectedOffer.created_at && (
                      <div className="text-[10px] text-muted-foreground mr-1">
                        vytvořeno {format(new Date(selectedOffer.created_at), "d. M. yyyy", { locale: cs })}
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedOffer.availability && (
                  <div>
                    <div className="text-sm font-semibold mb-1">Dostupnost</div>
                    <div className="text-sm">{selectedOffer.availability}</div>
                  </div>
                )}
                
                <div>
                  <div className="text-sm font-semibold mb-1">Zpráva</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedOffer.message}
                  </div>
                </div>

                {selectedOffer.photos && selectedOffer.photos.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold mb-2">Přílohy</div>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedOffer.photos.map((photo: string, index: number) => (
                        <div
                          key={index}
                          className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
                          onClick={() => window.open(photo, '_blank')}
                        >
                          <img
                            src={photo}
                            alt={`Příloha ${index + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedOffer.status === 'accepted' && selectedOffer.profiles?.phone && (
                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span className="font-semibold">Kontakt:</span>
                    <span>{selectedOffer.profiles.phone}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 w-full"
                    onClick={() => {
                      setSelectedOffer(null);
                      navigate(`/zakaznik/zpravy?offer=${selectedOffer.id}`);
                    }}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Napsat zprávu
                  </Button>
                </div>
              )}

              <div className="pt-4 border-t flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-3"
                    onClick={() => {
                      setSelectedWorkerId(selectedOffer.worker_id);
                    }}
                  >
                    <User className="h-4 w-4 mr-1" />
                    Profil
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="px-3"
                    onClick={() => {
                      setSelectedOffer(null);
                      navigate(`/zakaznik/zpravy?offer=${selectedOffer.id}`);
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Zpráva
                  </Button>
                </div>

                {selectedOffer.status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setConfirmingOffer(selectedOffer);
                    }}
                  >
                    Přijmout
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Worker Profile Card */}
      {selectedWorkerId && (
        <PublicWorkerProfileCard
          workerId={selectedWorkerId}
          open={!!selectedWorkerId}
          onOpenChange={(open) => { if (!open) setSelectedWorkerId(null); }}
        />
      )}

      <AcceptOfferConfirmDialog
        open={!!confirmingOffer}
        onOpenChange={() => setConfirmingOffer(null)}
        onConfirm={handleConfirmAccept}
        accepting={accepting}
        workerName={confirmingOffer?.profiles?.full_name}
        workerAvatarUrl={confirmingOffer?.profiles?.avatar_url}
        price={confirmingOffer?.price}
        availability={confirmingOffer?.availability}
        message={confirmingOffer?.message}
      />
    </>
  );
};

export default JobOffersDialog;
