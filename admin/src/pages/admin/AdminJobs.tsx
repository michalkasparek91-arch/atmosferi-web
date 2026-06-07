import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MoreHorizontal, Eye, Trash2, Briefcase, Clock, CheckCircle, XCircle, MapPin } from "lucide-react";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Job {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  city: string | null;
  budget_min: number | null;
  budget_max: number | null;
  photos: string[] | null;
  is_urgent: boolean;
  customer: { full_name: string } | null;
  accepted_offer?: { worker: { full_name: string } | null; price: number } | null;
  offers_count: number;
  service_subcategories: {
    name: string;
    service_categories: {
      name: string;
      icon: string;
      slug: string;
    } | null;
  } | null;
}

export default function AdminJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailJob, setDetailJob] = useState<Job | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    try {
      const { data: jobsData, error } = await supabase
        .from('jobs')
        .select(`
          id, title, description, status, created_at, customer_id, city, budget_min, budget_max, photos, is_urgent,
          service_subcategories (
            name,
            service_categories (
              name,
              icon,
              slug
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const customerIds = [...new Set(jobsData?.map(j => j.customer_id) || [])];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', customerIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const { data: acceptedOffers } = await supabase.from('offers').select('job_id, worker_id, price').eq('status', 'accepted');
      const workerIds = [...new Set(acceptedOffers?.map(o => o.worker_id) || [])];
      const { data: workerProfiles } = await supabase.from('profiles').select('id, full_name').in('id', workerIds.length > 0 ? workerIds : ['00000000-0000-0000-0000-000000000000']);
      const workerMap = new Map(workerProfiles?.map(p => [p.id, p]) || []);
      const offerMap = new Map(acceptedOffers?.map(o => [o.job_id, o]) || []);

      // Count offers per job
      const { data: allOffers } = await supabase.from('offers').select('job_id');
      const offerCounts = new Map<string, number>();
      allOffers?.forEach(o => offerCounts.set(o.job_id, (offerCounts.get(o.job_id) || 0) + 1));

      const enrichedJobs: Job[] = jobsData?.map(job => ({
        ...job,
        customer: profileMap.get(job.customer_id) || null,
        accepted_offer: offerMap.has(job.id)
          ? { worker: workerMap.get(offerMap.get(job.id)!.worker_id) || null, price: offerMap.get(job.id)!.price }
          : null,
        offers_count: offerCounts.get(job.id) || 0,
      })) || [];

      setJobs(enrichedJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job => statusFilter === "all" || job.status === statusFilter);

  const statusCounts = {
    all: jobs.length,
    open: jobs.filter(j => j.status === 'open').length,
    in_progress: jobs.filter(j => j.status === 'in_progress').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    cancelled: jobs.filter(j => j.status === 'cancelled').length,
    pending_approval: jobs.filter(j => j.status === 'pending_approval').length,
  };

  async function handleDeleteJob() {
    if (!selectedJob) return;
    try {
      const { error } = await supabase.from('jobs').delete().eq('id', selectedJob.id);
      if (error) throw error;
      toast.success(`Zakázka "${selectedJob.title}" byla smazána`);
      setJobs(jobs.filter(j => j.id !== selectedJob.id));
      setDeleteDialogOpen(false);
      setSelectedJob(null);
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error("Chyba při mazání zakázky");
    }
  };

  function getStatusBadge(status: string) {
    switch (status) {
      case 'open': return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Otevřená</Badge>;
      case 'in_progress': return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Probíhá</Badge>;
      case 'completed': return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Dokončená</Badge>;
      case 'cancelled': return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">Zrušená</Badge>;
      case 'pending_approval': return <Badge variant="outline" className="text-violet-600 border-violet-200 bg-violet-50">Ke schválení</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Briefcase}
        title="Zakázky"
        subtitle="Přehled všech zakázek na platformě"
      />

      {/* Stats row as filters */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {[
          { id: 'all', label: 'Celkem', value: statusCounts.all, icon: Briefcase, color: 'text-blue-500' },
          { id: 'open', label: 'Otevřené', value: statusCounts.open, icon: Clock, color: 'text-blue-500' },
          { id: 'in_progress', label: 'Probíhající', value: statusCounts.in_progress, icon: Clock, color: 'text-orange-500' },
          { id: 'completed', label: 'Dokončené', value: statusCounts.completed, icon: CheckCircle, color: 'text-green-500' },
          { id: 'cancelled', label: 'Zrušené', value: statusCounts.cancelled, icon: XCircle, color: 'text-red-500' },
          { id: 'pending_approval', label: 'Ke schválení', value: statusCounts.pending_approval, icon: Clock, color: 'text-violet-500' },
        ].map(s => {
          const isActive = statusFilter === s.id;
          return (
            <Card 
              key={s.id} 
              className={cn(
                "p-3.5 cursor-pointer transition-all border border-border shadow-none bg-white dark:bg-slate-900",
                isActive 
                  ? "bg-slate-50 dark:bg-slate-800 ring-1 ring-primary/20" 
                  : "hover:bg-slate-50/50 hover:shadow-sm"
              )}
              onClick={() => setStatusFilter(s.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className={cn(
                  "w-6 h-6 rounded-full border flex items-center justify-center transition-all",
                  isActive ? "border-primary/50 text-primary bg-primary/5 shadow-inner" : "border-slate-300 dark:border-slate-800 text-muted-foreground/40"
                )}>
                  <s.icon className="h-3 w-3" />
                </div>
                <p className={cn("text-[10px] font-medium transition-all", isActive ? "text-primary" : "text-muted-foreground opacity-60")}>{s.label}</p>
              </div>
              <p className="text-lg font-semibold tracking-tight mt-1">{s.value.toLocaleString()}</p>
            </Card>
          );
        })}
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-border/50">
              <TableHead className="text-[10px] h-9 font-medium text-muted-foreground opacity-60">Název</TableHead>
              <TableHead className="text-[10px] h-9 font-medium text-muted-foreground opacity-60">Zákazník</TableHead>
              <TableHead className="text-[10px] h-9 font-medium text-muted-foreground opacity-60">Pracovník</TableHead>
              <TableHead className="text-[10px] h-9 font-medium text-muted-foreground opacity-60">Nabídky</TableHead>
              <TableHead className="text-[10px] h-9 font-medium text-muted-foreground opacity-60">Status</TableHead>
              <TableHead className="text-[10px] h-9 font-medium text-muted-foreground opacity-60">Vytvořeno</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Žádné zakázky nebyly nalezeny
                </TableCell>
              </TableRow>
            ) : (
              filteredJobs.map((job) => (
                <TableRow key={job.id} className="cursor-pointer" onClick={() => setDetailJob(job)}>
                    <TableCell className="py-2.5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-foreground max-w-xs truncate">{job.title}</span>
                          {job.is_urgent && <Badge variant="destructive" className="text-[8px] px-1.5 py-0 font-medium tracking-widest uppercase">Urgentní</Badge>}
                        </div>
                        {job.service_subcategories && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {job.service_subcategories.service_categories && (
                              <div className="flex items-center justify-center w-4 h-4 rounded bg-primary/10 text-primary">
                                {(() => {
                                  const Icon = getCategoryIcon(job.service_subcategories.service_categories.icon, job.service_subcategories.service_categories.slug);
                                  return <Icon className="w-2.5 h-2.5" />;
                                })()}
                              </div>
                            )}
                            <span className="text-[9px] font-medium text-muted-foreground/80">
                              {job.service_subcategories.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground py-2.5 font-medium">{job.customer?.full_name || '—'}</TableCell>
                    <TableCell className="text-[10px] text-muted-foreground py-2.5 font-medium">{job.accepted_offer?.worker?.full_name || '—'}</TableCell>
                    <TableCell className="py-2.5"><Badge variant="secondary" className="text-[9px] font-bold px-1.5 py-0">+{job.offers_count}</Badge></TableCell>
                    <TableCell className="py-2.5">{getStatusBadge(job.status)}</TableCell>
                    <TableCell className="text-[10px] text-muted-foreground py-2.5 font-medium">
                      {format(new Date(job.created_at), 'd. M. yyyy', { locale: cs })}
                    </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted/60 transition-all active:scale-95" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4 opacity-60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDetailJob(job); }}>
                          <Eye className="h-4 w-4 mr-2" />Zobrazit detail
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJob(job);
                          setDeleteDialogOpen(true);
                        }}>
                          <Trash2 className="h-4 w-4 mr-2" />Smazat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail sheet */}
      <Sheet open={!!detailJob} onOpenChange={(open) => !open && setDetailJob(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {detailJob && (
            <>
              <SheetHeader>
                <SheetTitle className="text-left">{detailJob.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {getStatusBadge(detailJob.status)}
                  {detailJob.is_urgent && <Badge variant="destructive" className="text-[9px] font-bold uppercase tracking-widest">Urgentní</Badge>}
                  
                  {detailJob.service_subcategories && (
                    <Badge variant="outline" className="flex items-center gap-1.5 py-0.5 bg-slate-50 border-slate-200">
                      {detailJob.service_subcategories.service_categories && (
                        <div className="flex items-center justify-center w-3.5 h-3.5 rounded-sm bg-primary/10 text-primary">
                          {(() => {
                            const Icon = getCategoryIcon(detailJob.service_subcategories.service_categories.icon, detailJob.service_subcategories.service_categories.slug);
                            return <Icon className="w-2 h-2" />;
                          })()}
                        </div>
                      )}
                      <span className="text-[9px] font-bold uppercase tracking-tight text-slate-600">
                        {detailJob.service_subcategories.name}
                      </span>
                    </Badge>
                  )}
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Popis</p>
                    <p className="whitespace-pre-wrap">{detailJob.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Zákazník</p>
                      <p className="font-medium">{detailJob.customer?.full_name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Pracovník</p>
                      <p className="font-medium">{detailJob.accepted_offer?.worker?.full_name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Město</p>
                      <p className="font-medium">{detailJob.city || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Rozpočet</p>
                      <p className="font-medium">
                        {detailJob.budget_min || detailJob.budget_max
                          ? `${detailJob.budget_min?.toLocaleString('cs-CZ') || '?'} – ${detailJob.budget_max?.toLocaleString('cs-CZ') || '?'} Kč`
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Nabídky</p>
                      <p className="font-medium">{detailJob.offers_count}</p>
                    </div>
                    {detailJob.accepted_offer?.price && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">Dohodnutá cena</p>
                        <p className="font-medium">{detailJob.accepted_offer.price.toLocaleString('cs-CZ')} Kč</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] text-muted-foreground">Vytvořeno</p>
                      <p className="font-medium">{format(new Date(detailJob.created_at), 'd. M. yyyy HH:mm', { locale: cs })}</p>
                    </div>
                  </div>
                  {detailJob.photos && detailJob.photos.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Fotky</p>
                      <div className="grid grid-cols-3 gap-2">
                        {detailJob.photos.map((photo, i) => (
                          <img key={i} src={photo} alt="" className="rounded-lg object-cover aspect-square w-full" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono break-all">ID: {detailJob.id}</p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat zakázku?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat zakázku <strong>"{selectedJob?.title}"</strong>? Tato akce je nevratná.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteJob} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
