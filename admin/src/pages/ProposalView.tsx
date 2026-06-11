import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRight } from "lucide-react";

export default function ProposalView() {
  const { id } = useParams();
  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProposal = async () => {
      if (!id) return;
      const { data, error } = await supabase.from("proposals").select("*").eq("id", id).maybeSingle();
      if (!error && data) {
        setProposal(data);
        // Increment view count via an RPC or simply update it (if RLS allows, better to have a secure edge function, but for now we just attempt update or ignore)
        supabase.rpc("increment_proposal_views", { p_id: id }).catch(() => {});
      }
      setLoading(false);
    };
    fetchProposal();
  }, [id]);

  if (loading) return <div className="min-h-screen bg-[#EFEDE6] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#16140F]/30" /></div>;
  if (!proposal) return <div className="min-h-screen bg-[#EFEDE6] flex items-center justify-center font-['Geist'] text-[#16140F]">Nabídka nenalezena nebo vypršela.</div>;

  return (
    <div className="min-h-screen bg-[#EFEDE6] font-['Geist'] selection:bg-[#D97757] selection:text-white pb-20">
      {/* Header */}
      <div className="w-full bg-[#16140F] py-5 px-6 flex justify-between items-center text-[#EFEDE6]">
        <div>
          <span className="font-semibold text-lg tracking-tight">Atmosferi<sup className="text-[#D97757] text-[0.6em]">&deg;</sup></span>
        </div>
        <div className="text-[10px] uppercase tracking-widest font-mono opacity-60">Interaktivní Nabídka</div>
      </div>

      <div className="max-w-4xl mx-auto mt-12 px-6">
        <div className="bg-[#FBFAF6] p-10 md:p-16 rounded-sm shadow-sm border border-[rgba(22,20,15,0.05)]">
          <div className="text-[10px] font-mono tracking-[0.2em] text-[#D97757] uppercase mb-4">Pro: {proposal.client_name} ({proposal.company_name})</div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#16140F] mb-8">{proposal.project_title}</h1>
          
          <div className="prose prose-zinc prose-p:text-[15px] prose-p:leading-relaxed text-[#33302A] max-w-none mb-12 whitespace-pre-wrap">
            {proposal.description}
          </div>

          <div className="bg-[#EFEDE6] p-8 mb-12 border-l-4 border-[#D97757]">
            <p className="text-xs font-mono tracking-widest uppercase text-[#807C72] mb-2">Rozpočet</p>
            <p className="text-2xl font-semibold text-[#16140F]">{proposal.price_quote}</p>
          </div>

          <h3 className="text-xs font-mono tracking-widest uppercase text-[#807C72] mb-6">Referenční ukázky</h3>
          {proposal.portfolio_images && proposal.portfolio_images.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              {proposal.portfolio_images.map((img: string, i: number) => (
                <img key={i} src={img} alt={`Reference ${i}`} className="w-full h-auto aspect-video object-cover" />
              ))}
            </div>
          )}

          <div className="border-t border-[rgba(22,20,15,0.1)] pt-12 flex flex-col items-center text-center">
            <h2 className="text-xl font-semibold mb-6">Dává vám tento směr smysl?</h2>
            <button 
              onClick={() => {
                supabase.from("proposals").update({ status: 'accepted' }).eq('id', proposal.id);
                alert("Nabídka byla schválena. Brzy se s vámi spojíme pro další kroky.");
                window.location.reload();
              }}
              className="bg-[#16140F] hover:bg-[#D97757] transition-colors text-white px-8 py-4 font-mono text-[11px] uppercase tracking-widest font-semibold flex items-center gap-3"
            >
              Schvaluji nabídku <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
