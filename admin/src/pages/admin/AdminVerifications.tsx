import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import {
  ShieldCheck,
  ShieldX,
  Clock,
  Eye,
  Check,
  X,
  Loader2,
  Building2,
  User,
  FileText,
  CheckCircle,
  Search,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { cn } from "@/lib/utils";

type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

interface Verification {
  id: string;
  worker_id: string;
  status: VerificationStatus;
  ico: string | null;
  company_name: string | null;
  company_address: string | null;
  id_card_path: string | null;
  trade_license_path: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  profiles: {
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  };
}

export default function AdminVerifications() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [idCardUrl, setIdCardUrl] = useState<string | null>(null);
  const [tradeLicenseUrl, setTradeLicenseUrl] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadVerifications();
  }, [filter]);

  async function loadVerifications() {
    try {
      let query = supabase
        .from('worker_verifications')
        .select(`
          *,
          profiles!worker_id (
            full_name,
            email,
            phone,
            avatar_url
          )
        `)
        .order('submitted_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('status', 'pending');
      }

      const { data, error } = await query;

      if (error) throw error;
      setVerifications((data as unknown as Verification[]) || []);
    } catch (error) {
      console.error('Error loading verifications:', error);
      toast.error('Nepodařilo se načíst žádosti');
    } finally {
      setLoading(false);
    }
  };

  async function openReviewDialog(verification: Verification) {
    setSelectedVerification(verification);
    setIdCardUrl(null);
    setTradeLicenseUrl(null);

    if (verification.id_card_path) {
      const { data } = await supabase.storage
        .from('verification-documents')
        .createSignedUrl(verification.id_card_path, 300);
      if (data) setIdCardUrl(data.signedUrl);
    }

    if (verification.trade_license_path) {
      const { data } = await supabase.storage
        .from('verification-documents')
        .createSignedUrl(verification.trade_license_path, 300);
      if (data) setTradeLicenseUrl(data.signedUrl);
    }

    setReviewDialogOpen(true);
  };

  async function handleApprove() {
    if (!selectedVerification) return;

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: updateError } = await supabase
        .from('worker_verifications')
        .update({
          status: 'verified',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          rejection_reason: null,
        })
        .eq('id', selectedVerification.id);

      if (updateError) throw updateError;

      // GDPR: Delete the ID card image after approval
      if (selectedVerification.id_card_path) {
        const { error: deleteError } = await supabase.storage
          .from('verification-documents')
          .remove([selectedVerification.id_card_path]);
        
        if (deleteError) {
          console.error('Error deleting ID card:', deleteError);
        }

        await supabase
          .from('worker_verifications')
          .update({ id_card_path: null })
          .eq('id', selectedVerification.id);
      }

      toast.success(`${selectedVerification.profiles.full_name} byl úspěšně ověřen`);
      
      // Notify worker
      supabase.functions.invoke('notify-verification-result', {
        body: { workerId: selectedVerification.worker_id, status: 'verified' }
      }).catch(err => console.error('Notification error:', err));

      setReviewDialogOpen(false);
      loadVerifications();
    } catch (error) {
      console.error('Error approving verification:', error);
      toast.error('Nepodařilo se schválit žádost');
    } finally {
      setProcessing(false);
    }
  };

  async function handleReject() {
    if (!selectedVerification || !rejectionReason.trim()) {
      toast.error('Zadejte důvod zamítnutí');
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('worker_verifications')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          rejection_reason: rejectionReason.trim(),
        })
        .eq('id', selectedVerification.id);

      if (error) throw error;

      toast.success('Žádost byla zamítnuta');

      // Notify worker
      supabase.functions.invoke('notify-verification-result', {
        body: { 
          workerId: selectedVerification.worker_id, 
          status: 'rejected', 
          reason: rejectionReason.trim() 
        }
      }).catch(err => console.error('Notification error:', err));

      setRejectDialogOpen(false);
      setReviewDialogOpen(false);
      setRejectionReason('');
      loadVerifications();
    } catch (error) {
      console.error('Error rejecting verification:', error);
      toast.error('Nepodařilo se zamítnout žádost');
    } finally {
      setProcessing(false);
    }
  };

  function getStatusBadge(status: VerificationStatus) {
    const config = {
      pending: { label: 'Čeká', variant: 'outline' as const, icon: Clock },
      verified: { label: 'Ověřeno', variant: 'default' as const, icon: ShieldCheck },
      rejected: { label: 'Zamítnuto', variant: 'destructive' as const, icon: ShieldX },
      unverified: { label: 'Neověřeno', variant: 'secondary' as const, icon: AlertTriangle },
    };
    const { label, variant, icon: Icon } = config[status];
    return (
      <Badge variant={variant} className="gap-1 rounded-full text-[10px] font-medium px-2 py-0.5 border-border/40 shadow-none">
        <Icon className="h-2.5 w-2.5 opacity-70" />
        {label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={CheckCircle}
        title="Verifikace"
        subtitle="Schvalování identity pracovníků"
        actions={
          <div className="flex gap-3 items-center">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Hledat podle jména..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-48 md:w-64 pl-9 pr-4 rounded-full bg-muted/50 border-none text-[10px] focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
            <div className="h-6 w-px bg-border/40 mx-1" />
            <span className="text-[10px] font-medium text-muted-foreground opacity-60 mr-2">
              K vyřízení: {verifications.filter(v => v.status === 'pending').length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter('pending')}
              className={cn(
                "rounded-full px-4 h-7 text-[10px] font-medium transition-all",
                filter === 'pending' ? "bg-primary text-primary-foreground shadow-sm" : "bg-transparent text-muted-foreground hover:text-primary hover:bg-primary/5"
              )}
            >
              Čekající
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter('all')}
              className={cn(
                "rounded-full px-4 h-7 text-[10px] font-medium transition-all",
                filter === 'all' ? "bg-primary text-primary-foreground shadow-sm" : "bg-transparent text-muted-foreground hover:text-primary hover:bg-primary/5"
              )}
            >
              Všechny
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Žádosti o ověření</CardTitle>
          <CardDescription>
            {filter === 'pending' 
              ? 'Žádosti čekající na schválení'
              : 'Všechny žádosti o ověření'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {verifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Žádné žádosti k zobrazení</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-border/50">
                  <TableHead className="text-[10px] h-9 font-medium text-muted-foreground opacity-60">Uživatel</TableHead>
                  <TableHead className="text-[10px] h-9 font-medium text-muted-foreground opacity-60">IČO</TableHead>
                  <TableHead className="text-[10px] h-9 font-medium text-muted-foreground opacity-60">Spolecnost</TableHead>
                  <TableHead className="text-[10px] h-9 font-medium text-muted-foreground opacity-60">Odesláno</TableHead>
                  <TableHead className="text-[10px] h-9 font-medium text-muted-foreground opacity-60">Stav</TableHead>
                  <TableHead className="text-[10px] h-9 font-medium text-muted-foreground opacity-60 text-right pr-6">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verifications
                  .filter(v => 
                    v.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    v.profiles.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (v.ico && v.ico.includes(searchQuery))
                  )
                  .map((verification) => (
                  <TableRow key={verification.id} className="group transition-colors hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={verification.profiles.avatar_url || undefined} />
                          <AvatarFallback>
                            {verification.profiles.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <p className="text-[11px] font-semibold text-foreground truncate leading-tight">{verification.profiles.full_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate font-medium">
                            {verification.profiles.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[10px] font-mono py-2.5">{verification.ico || '-'}</TableCell>
                    <TableCell className="text-[10px] py-2.5 font-medium">{verification.company_name || '-'}</TableCell>
                    <TableCell className="text-[10px] py-2.5 text-muted-foreground font-medium">
                      {verification.submitted_at
                        ? format(new Date(verification.submitted_at), 'd.M.yy', { locale: cs })
                        : '-'}
                    </TableCell>
                    <TableCell className="py-2.5">{getStatusBadge(verification.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-full text-[10px] font-medium hover:bg-muted/60 active:scale-95 transition-all"
                        onClick={() => openReviewDialog(verification)}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5 opacity-60" />
                        Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Kontrola žádosti o ověření
            </DialogTitle>
            <DialogDescription>
              Zkontrolujte údaje a dokumenty před schválením
            </DialogDescription>
          </DialogHeader>

          {selectedVerification && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedVerification.profiles.avatar_url || undefined} />
                  <AvatarFallback className="text-lg">
                    {selectedVerification.profiles.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-base font-semibold">
                    {selectedVerification.profiles.full_name}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">{selectedVerification.profiles.email}</p>
                  {selectedVerification.profiles.phone && (
                    <p className="text-[10px] text-muted-foreground">{selectedVerification.profiles.phone}</p>
                  )}
                </div>
                {getStatusBadge(selectedVerification.status)}
              </div>

              {/* Business Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Firemní údaje
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-[10px]">
                    <div>
                      <span className="text-muted-foreground">IČO:</span>
                      <span className="ml-2 font-mono font-medium">
                        {selectedVerification.ico}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Společnost:</span>
                      <span className="ml-2">{selectedVerification.company_name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Adresa:</span>
                      <span className="ml-2">{selectedVerification.company_address || '-'}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Dokumenty
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Občanský průkaz:</span>
                      {selectedVerification.id_card_path ? (
                        <Badge variant="outline" className="gap-1">
                          <Check className="h-3 w-3" />
                          Nahrán
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Chybí</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Živnostenský list:</span>
                      {selectedVerification.trade_license_path ? (
                        <Badge variant="outline" className="gap-1">
                          <Check className="h-3 w-3" />
                          Nahrán
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Neposkytnut</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Document Preview */}
              <div className="grid md:grid-cols-2 gap-4">
                {idCardUrl && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Občanský průkaz
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <img
                        src={idCardUrl}
                        alt="ID Card"
                        className="w-full rounded-lg border"
                      />
                      <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                        <Trash2 className="h-3 w-3" />
                        Bude smazán po schválení (GDPR)
                      </p>
                    </CardContent>
                  </Card>
                )}

                {tradeLicenseUrl && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Živnostenský list
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <img
                        src={tradeLicenseUrl}
                        alt="Trade License"
                        className="w-full rounded-lg border"
                      />
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Previous rejection reason */}
              {selectedVerification.rejection_reason && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-[10px] font-medium text-destructive mb-1">
                    Předchozí důvod zamítnutí:
                  </p>
                  <p className="text-[10px]">{selectedVerification.rejection_reason}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <Button
              variant="destructive"
              onClick={() => setRejectDialogOpen(true)}
              disabled={processing || selectedVerification?.status === 'rejected'}
            >
              <X className="mr-2 h-4 w-4" />
              Zamítnout
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing || selectedVerification?.status === 'verified'}
            >
              {processing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Schválit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldX className="h-5 w-5" />
              Zamítnout žádost
            </DialogTitle>
            <DialogDescription>
              Zadejte důvod zamítnutí. Uživatel obdrží notifikaci s tímto důvodem.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder="Např.: Nečitelná fotografie občanského průkazu, IČO neodpovídá jménu..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRejectDialogOpen(false)}
              >
                Zrušit
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
              >
                {processing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <X className="mr-2 h-4 w-4" />
                )}
                Zamítnout
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
