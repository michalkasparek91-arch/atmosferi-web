import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Sparkles, Send, Loader2, Upload, X, ListChecks, Check } from "lucide-react";
import { safeGoBack } from "@/utils/navigation";
import { toast } from "@/hooks/use-toast";
import { compressJobPhoto } from "@/lib/image-compression";
import { generateId, cn } from "@/lib/utils";
import { geocodeAddress } from "@/lib/geocode-address";
import { pingIndexNow } from "@/lib/seo";

type ChatMessage = { role: "user" | "assistant"; content: string };

type CollectedData = {
  categoryId?: string | null;
  categoryName?: string | null;
  subcategoryId?: string | null;
  subcategoryName?: string | null;
  description?: string | null;
  streetName?: string | null;
  streetNumber?: string | null;
  city?: string | null;
  postalCode?: string | null;
  deadlineType?: "asap" | "agreement" | "specific" | null;
  deadlineDate?: string | null;
  priceNote?: string | null;
};

const REQUIRED_FIELDS: (keyof CollectedData)[] = [
  "categoryId",
  "subcategoryId",
  "description",
  "streetName",
  "streetNumber",
  "city",
  "deadlineType",
];

function isReady(data: CollectedData) {
  for (const f of REQUIRED_FIELDS) {
    const v = data[f];
    if (!v || (typeof v === "string" && v.trim().length === 0)) return false;
  }
  if ((data.description?.length || 0) < 20) return false;
  if (data.deadlineType === "specific" && !data.deadlineDate) return false;
  return true;
}

const DEADLINE_LABEL: Record<string, string> = {
  asap: "Co nejdříve",
  agreement: "Dle dohody",
  specific: "Konkrétní datum",
};

export default function JobPostingAssistant() {
  const navigate = useNavigate();
  const { conversationId: routeId } = useParams<{ conversationId?: string }>();

  const [conversationId, setConversationId] = useState<string | null>(routeId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [collected, setCollected] = useState<CollectedData>({});
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load existing conversation (if routeId) or kick off a new one
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth?mode=login");
        return;
      }
      if (routeId) {
        const { data, error } = await supabase
          .from("job_posting_conversations")
          .select("id, messages, collected_data, status, created_job_id")
          .eq("id", routeId)
          .maybeSingle();
        if (!cancelled && data) {
          if (data.created_job_id) {
            navigate("/zakaznik/poptavky");
            return;
          }
          setConversationId(data.id);
          setMessages((data.messages as ChatMessage[]) || []);
          setCollected((data.collected_data as CollectedData) || {});
          setBootstrapped(true);
          return;
        }
      }
      // Brand new — call edge function with no user message to get greeting
      if (!cancelled) {
        setBootstrapped(true);
        await sendToAi("", []);
      }
    }
    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // Focus textarea
  useEffect(() => {
    if (!sending && !submitting) textareaRef.current?.focus();
  }, [sending, submitting, messages.length]);

  const sendToAi = useCallback(async (userMsg: string, currentHistory: ChatMessage[]) => {
    setSending(true);
    setQuickReplies([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("job-posting-chat", {
        body: {
          conversationId,
          userMessage: userMsg || undefined,
          collectedData: collected,
          messageHistory: currentHistory,
          photoCount: photos.length,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newAssistant: ChatMessage = { role: "assistant", content: data.assistantMessage || "" };
      setMessages([...currentHistory, ...(userMsg ? [{ role: "user" as const, content: userMsg }] : []), newAssistant]);
      setCollected(data.collectedData || {});
      setQuickReplies(data.quickReplies || []);
      if (data.conversationId && data.conversationId !== conversationId) {
        setConversationId(data.conversationId);
        if (!routeId) {
          window.history.replaceState(null, "", `/poptat-praci/asistent/${data.conversationId}`);
        }
      }
    } catch (e: any) {
      toast({
        title: "Asistent nedostupný",
        description: e.message || "Zkuste to prosím znovu.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }, [conversationId, collected, photos.length, routeId]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    await sendToAi(text, messages);
  };

  const handleQuickReply = async (label: string) => {
    if (sending) return;
    await sendToAi(label, messages);
  };

  const onPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const removePhoto = (i: number) => setPhotos((prev) => prev.filter((_, idx) => idx !== i));

  const handleFinalSubmit = async () => {
    if (!isReady(collected)) {
      toast({ title: "Chybí údaje", description: "Asistent se ještě doptá na chybějící informace.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nepřihlášený uživatel");

      // Upload photos
      const photoUrls = (await Promise.all(
        photos.map(async (photo) => {
          try {
            const compressed = await compressJobPhoto(photo);
            const fileName = `${user.id}/${generateId()}.jpg`;
            const { error: upErr } = await supabase.storage.from("job-photos").upload(fileName, compressed);
            if (upErr) throw upErr;
            const { data: { publicUrl } } = supabase.storage.from("job-photos").getPublicUrl(fileName);
            return publicUrl;
          } catch (err) {
            console.error("photo upload failed", err);
            return null;
          }
        }),
      )).filter((u): u is string => !!u);

      // Geocode (use existing util if address available)
      let coords: { lat: number; lng: number } | null = null;
      try {
        coords = await geocodeAddress(
          collected.streetName!, collected.streetNumber!, collected.city!, collected.postalCode || "",
        );
      } catch { /* non-blocking */ }

      const fullAddress = `${collected.streetName} ${collected.streetNumber}, ${collected.postalCode || ""} ${collected.city}`.replace(/\s+/g, " ").trim();

      const { data: newJob, error: jobError } = await supabase
        .from("jobs")
        .insert([{
          customer_id: user.id,
          category_id: collected.categoryId!,
          subcategory_id: collected.subcategoryId!,
          title: collected.subcategoryName || collected.categoryName || "Nová zakázka",
          description: collected.description!,
          city: collected.city!,
          full_address: fullAddress,
          budget_min: null,
          budget_max: null,
          price_note: collected.priceNote || null,
          photos: photoUrls,
          status: "open",
          deadline_type: collected.deadlineType,
          deadline_date: collected.deadlineType === "specific" && collected.deadlineDate
            ? new Date(collected.deadlineDate).toISOString() : null,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          is_urgent: false,
        }])
        .select()
        .single();

      if (jobError) throw jobError;

      if (newJob && conversationId) {
        await supabase.from("job_posting_conversations")
          .update({ status: "completed", created_job_id: newJob.id })
          .eq("id", conversationId);
      }

      if (newJob?.slug) pingIndexNow(`/poptavka/${newJob.slug}`);

      if (newJob) {
        supabase.functions.invoke("notify-workers-new-job", { body: { job: newJob } })
          .catch((err) => console.log("[Push] notify-workers-new-job failed:", err));
      }

      import("@/lib/analytics").then(({ analytics }) => {
        analytics.trackConversion("job_posted", {
          subcategory_id: collected.subcategoryId,
          source: "ai_assistant",
        });
      });

      toast({ title: "Hotovo!", description: "Vaše poptávka byla vytvořena." });
      navigate("/zakaznik/poptavky");
    } catch (e: any) {
      toast({ title: "Chyba", description: e.message || "Nepodařilo se vytvořit poptávku.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const ready = isReady(collected);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="px-3 md:px-4 py-3 flex items-center gap-2 border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-10">
        <Button variant="ghost" size="sm" onClick={() => safeGoBack(navigate, "/nova-poptavka")} className="rounded-full">
          <ArrowLeft className="h-4 w-4 mr-1" /> Zpět
        </Button>
        <div className="flex items-center gap-2 ml-2">
          <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">AI asistent</p>
            <p className="text-[11px] text-muted-foreground leading-tight">Pomůžu vám zadat poptávku</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row max-w-5xl mx-auto w-full">
        {/* Chat */}
        <div className="flex-1 flex flex-col min-h-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 md:px-5 py-4 space-y-3 overscroll-contain">
            {!bootstrapped && (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Načítám asistenta…
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-snug",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card text-card-foreground border border-border rounded-bl-md",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Přemýšlím…
                </div>
              </div>
            )}
            {!sending && quickReplies.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {quickReplies.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickReply(q)}
                    className="px-3 py-1.5 text-xs font-medium rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Photo strip */}
          {photos.length > 0 && (
            <div className="px-3 md:px-5 pb-2 flex gap-2 overflow-x-auto">
              {photos.map((p, i) => (
                <div key={i} className="relative h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                  <img src={URL.createObjectURL(p)} alt="" className="h-full w-full object-cover" />
                  <button onClick={() => removePhoto(i)} className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Composer */}
          <div className="border-t border-border/40 px-3 md:px-5 py-3 bg-background pb-[max(env(safe-area-inset-bottom),0.75rem)]">
            <div className="flex items-end gap-2">
              <label className="h-10 w-10 flex-shrink-0 rounded-full border border-border bg-card flex items-center justify-center cursor-pointer hover:bg-muted">
                <Upload className="h-4 w-4" strokeWidth={1.75} />
                <input type="file" accept="image/*" multiple onChange={onPhotoUpload} className="hidden" />
              </label>
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder={ready ? "Můžete poptávku odeslat napravo, nebo ještě něco upřesnit…" : "Napište zprávu…"}
                className="resize-none min-h-[40px] max-h-32 rounded-2xl bg-card border-border"
                disabled={sending || submitting}
              />
              <Button onClick={handleSend} disabled={!input.trim() || sending || submitting} size="icon" className="h-10 w-10 rounded-full flex-shrink-0">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Draft summary */}
        <aside className="md:w-[280px] md:border-l border-border/40 px-3 md:px-4 py-4 bg-muted/30 md:bg-transparent">
          <Card className="p-4 space-y-3 bg-background/60 backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
              <ListChecks className="h-4 w-4" strokeWidth={1.75} /> Shrnutí
            </div>
            <DraftRow label="Kategorie" value={collected.categoryName} />
            <DraftRow label="Služba" value={collected.subcategoryName} />
            <DraftRow label="Popis" value={collected.description ? `${collected.description.slice(0, 60)}${collected.description.length > 60 ? "…" : ""}` : null} />
            <DraftRow label="Adresa" value={[collected.streetName, collected.streetNumber, collected.city].filter(Boolean).join(" ") || null} />
            <DraftRow label="Termín" value={
              collected.deadlineType
                ? collected.deadlineType === "specific"
                  ? `Datum: ${collected.deadlineDate || "—"}`
                  : DEADLINE_LABEL[collected.deadlineType]
                : null
            } />
            <DraftRow label="Fotky" value={photos.length > 0 ? `${photos.length}` : null} />
            {collected.priceNote && <DraftRow label="Cena" value={collected.priceNote} />}

            <Button
              onClick={handleFinalSubmit}
              disabled={!ready || submitting || sending}
              className="w-full rounded-full mt-2"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Odesílám…</>
              ) : ready ? (
                <><Check className="h-4 w-4 mr-2" /> Odeslat poptávku</>
              ) : (
                "Vše ještě není vyplněno"
              )}
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function DraftRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 text-xs">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</span>
      <span className={cn("font-medium", value ? "text-foreground" : "text-muted-foreground/60 italic")}>
        {value || "—"}
      </span>
    </div>
  );
}
