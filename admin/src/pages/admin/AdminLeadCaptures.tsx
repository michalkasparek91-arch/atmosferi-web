import { useEffect, useState } from "react";
import { Inbox, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConvertLeadToJobDialog } from "@/components/admin/ConvertLeadToJobDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LeadCapture {
  id: string;
  email: string;
  request_text: string | null;
  status: string;
  created_at: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

const STATUS_OPTIONS = [
  { value: "new", label: "Nová" },
  { value: "contacted", label: "Kontaktováno" },
  { value: "converted", label: "Převedeno" },
  { value: "closed", label: "Uzavřeno" },
];

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "new"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
      : status === "contacted"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
      : status === "converted"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
      : "bg-muted text-muted-foreground";
  const label = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
  return <Badge className={`${cls} border-transparent hover:${cls}`}>{label}</Badge>;
}

export default function AdminLeadCaptures() {
  const [leads, setLeads] = useState<LeadCapture[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<LeadCapture | null>(null);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lead_captures")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error("Nepodařilo se načíst poptávky");
      console.error(error);
    } else {
      setLeads((data ?? []) as LeadCapture[]);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const prev = leads;
    setLeads((curr) => curr.map((l) => (l.id === id ? { ...l, status } : l)));
    const { error } = await supabase.from("lead_captures").update({ status }).eq("id", id);
    if (error) {
      toast.error("Nepodařilo se uložit změnu");
      setLeads(prev);
    } else {
      toast.success("Status aktualizován");
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div>
      <AdminPageHeader
        icon={Inbox}
        title="Zachycené poptávky"
        subtitle="Leads z exit-intent popupu"
      />

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground">Zatím žádné poptávky</p>
            <p className="text-xs text-muted-foreground mt-1">
              Lead se zobrazí, jakmile někdo odešle exit-intent formulář.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Datum</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Poptávka</TableHead>
                <TableHead>Zdroj</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[160px]">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow 
                  key={lead.id}
                  className={lead.status === "converted" ? "opacity-60 grayscale-[0.5]" : ""}
                >
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(lead.created_at)}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    <a
                      href={`mailto:${lead.email}`}
                      className="hover:underline text-primary"
                    >
                      {lead.email}
                    </a>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[400px]">
                    <div className="truncate" title={lead.request_text ?? ""}>
                      {lead.request_text || <span className="italic opacity-60">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {lead.utm_source ? (
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-muted/50 border-muted">
                          {lead.utm_source}
                        </Badge>
                        {(lead.utm_medium || lead.utm_campaign) && (
                          <span className="text-[10px] text-muted-foreground self-center">
                            / {lead.utm_medium || "—"} / {lead.utm_campaign || "—"}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">přímá návštěva</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={lead.status}
                        onValueChange={(v) => updateStatus(lead.id, v)}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {lead.status !== "converted" && (
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 text-primary border-primary/20 hover:bg-primary/5"
                          title="Vytvořit zakázku"
                          onClick={() => {
                            setSelectedLead(lead);
                            setIsConvertDialogOpen(true);
                          }}
                        >
                          <Wand2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ConvertLeadToJobDialog
        open={isConvertDialogOpen}
        onOpenChange={setIsConvertDialogOpen}
        lead={selectedLead}
        onSuccess={load}
      />
    </div>
  );
}
