import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Mail, MessageCircle, RefreshCw, Send, CheckCircle2, AlertCircle, HelpCircle, Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface EmailReply {
  id: string;
  from_email: string;
  from_name: string;
  subject: string;
  body_text: string;
  ai_sentiment: 'interested' | 'not_now' | 'unsubscribe' | 'question' | 'other';
  ai_draft_reply: string;
  status: 'unread' | 'read' | 'replied';
  created_at: string;
}

export function SmartInbox() {
  const [replies, setReplies] = useState<EmailReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReply, setSelectedReply] = useState<EmailReply | null>(null);
  const [draftText, setDraftText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const fetchReplies = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("email_replies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Chyba při načítání inboxu.");
    } else {
      setReplies(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchReplies();
  }, []);

  const handleSelectReply = async (reply: EmailReply) => {
    setSelectedReply(reply);
    setDraftText(reply.ai_draft_reply || "");
    
    if (reply.status === 'unread') {
      await supabase.from("email_replies").update({ status: 'read' }).eq("id", reply.id);
      setReplies(prev => prev.map(r => r.id === reply.id ? { ...r, status: 'read' } : r));
    }
  };

  const handleSendReply = async () => {
    if (!selectedReply) return;
    setIsSending(true);
    
    try {
      const res = await supabase.functions.invoke("admin-send-broadcast-email", {
        body: {
          testTargetEmail: selectedReply.from_email,
          testSubject: `Re: ${selectedReply.subject.replace(/^(Re:\s*)+/i, '')}`,
          testContent: draftText,
          isManualTest: true
        }
      });

      if (res.error) throw new Error(res.error.message || "Failed to send");
      
      await supabase.from("email_replies").update({ status: 'replied' }).eq("id", selectedReply.id);
      setReplies(prev => prev.map(r => r.id === selectedReply.id ? { ...r, status: 'replied' } : r));
      
      toast.success("Odpověď byla úspěšně odeslána!");
      setSelectedReply(null);
    } catch (e: any) {
      toast.error("Chyba při odesílání: " + e.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("email_replies").delete().eq("id", id);
    setReplies(prev => prev.filter(r => r.id !== id));
    if (selectedReply?.id === id) setSelectedReply(null);
    toast.success("Smazáno.");
  };

  const getSentimentConfig = (sentiment: string) => {
    switch (sentiment) {
      case 'interested': return { icon: <CheckCircle2 className="w-3 h-3 text-emerald-500" />, bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", label: "Zájem" };
      case 'question': return { icon: <HelpCircle className="w-3 h-3 text-blue-500" />, bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-600 dark:text-blue-400", label: "Dotaz" };
      case 'not_now': return { icon: <Archive className="w-3 h-3 text-amber-500" />, bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-600 dark:text-amber-400", label: "Ne teď" };
      case 'unsubscribe': return { icon: <AlertCircle className="w-3 h-3 text-rose-500" />, bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-600 dark:text-rose-400", label: "Odhlášení" };
      default: return { icon: <MessageCircle className="w-3 h-3 text-zinc-500" />, bg: "bg-zinc-500/10", border: "border-zinc-500/20", text: "text-zinc-600 dark:text-zinc-400", label: "Ostatní" };
    }
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] border border-border bg-background shadow-xs overflow-hidden">
      
      {/* LEFT PANEL: INBOX LIST */}
      <div className="w-1/3 min-w-[320px] max-w-[400px] border-r border-border flex flex-col bg-muted/10">
        <div className="p-4 border-b border-border flex items-center justify-between bg-background">
          <h2 className="font-bold tracking-tight text-foreground flex items-center gap-2">
            <Mail className="w-4 h-4" /> Smart Inbox
          </h2>
          <button onClick={fetchReplies} disabled={isLoading} className="p-1.5 hover:bg-muted text-muted-foreground rounded transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading && replies.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Načítání schránky...</div>
          ) : replies.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Schránka je prázdná.</div>
          ) : (
            <div className="flex flex-col">
              {replies.map(reply => {
                const conf = getSentimentConfig(reply.ai_sentiment);
                return (
                  <div 
                    key={reply.id} 
                    onClick={() => handleSelectReply(reply)}
                    className={`p-4 border-b border-border/50 cursor-pointer transition-colors relative group ${selectedReply?.id === reply.id ? "bg-accent/50 dark:bg-accent" : "hover:bg-muted/50"} ${reply.status === 'unread' ? "bg-background" : ""}`}
                  >
                    {reply.status === 'unread' && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />}
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <div className={`font-semibold text-sm truncate ${reply.status === 'unread' ? "text-foreground" : "text-muted-foreground"}`}>
                        {reply.from_name}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-sm border ${conf.bg} ${conf.border} ${conf.text}`}>
                          {conf.icon} {conf.label}
                        </span>
                        <button onClick={(e) => handleDelete(reply.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 hover:text-red-500 text-muted-foreground transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className={`text-xs truncate mb-1.5 ${reply.status === 'unread' ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {reply.subject}
                    </div>
                    <div className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
                      {reply.body_text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: EMAIL DETAIL & REPLY */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedReply ? (
          <>
            {/* Header Detail */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-muted border border-border flex items-center justify-center font-bold text-muted-foreground">
                  {selectedReply.from_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">{selectedReply.subject}</h3>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Od: <span className="font-medium text-foreground">{selectedReply.from_name}</span> &lt;{selectedReply.from_email}&gt;
                  </div>
                </div>
              </div>
              <div className="text-sm text-foreground whitespace-pre-wrap font-serif leading-relaxed bg-muted/30 p-4 border border-border/50">
                {selectedReply.body_text}
              </div>
            </div>

            {/* AI Draft Section */}
            <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">AI Návrh odpovědi (Gemini)</h4>
              </div>
              
              <textarea 
                value={draftText}
                onChange={e => setDraftText(e.target.value)}
                className="w-full flex-1 min-h-[200px] p-4 text-sm font-mono leading-relaxed bg-background border border-border text-foreground focus:outline-hidden focus:border-primary/50 transition-colors resize-none shadow-xs"
                placeholder="Napište odpověď..."
              />

              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-muted-foreground">
                  Status: {selectedReply.status === 'replied' ? <span className="text-emerald-500 font-bold">Odpovězeno</span> : "Čeká na vyřízení"}
                </div>
                <button 
                  onClick={handleSendReply}
                  disabled={isSending || !draftText.trim()}
                  className={`flex items-center gap-2 px-6 py-2.5 bg-foreground text-background font-bold text-xs uppercase tracking-wider hover:bg-foreground/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isSending ? "Odesílání..." : "Odeslat odpověď"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Mail className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-medium text-sm">Vyberte zprávu k zobrazení</p>
          </div>
        )}
      </div>

    </div>
  );
}
