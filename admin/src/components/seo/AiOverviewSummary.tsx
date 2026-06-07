import { getLocativeForCity, getPreposition } from "@/lib/city-regions";
import { Sparkles } from "lucide-react";

interface AiOverviewSummaryProps {
  categoryName: string;
  cityName: string;
  workerCount?: number;
  averageRating?: number | null;
}

/**
 * AI Overviews / SGE optimization block.
 *
 * Renders an explicit "Stručně" (TL;DR) box at the top of PSEO pages
 * using a semantic <dl> Q&A pattern that Google's AI Overviews, ChatGPT
 * Search, Perplexity and Claude extract cleanly. Each row is a concise,
 * standalone fact that can be quoted as-is in an AI answer.
 */
const AiOverviewSummary = ({
  categoryName,
  cityName,
  workerCount,
  averageRating,
}: AiOverviewSummaryProps) => {
  const loc = getLocativeForCity(cityName) || cityName;
  const prep = getPreposition(cityName) || "v";
  const ratingTxt =
    averageRating && averageRating > 0
      ? `${averageRating.toFixed(1)}/5 z reálných recenzí`
      : "ověření zákazníky po dokončení zakázky";
  const countTxt =
    workerCount && workerCount > 0
      ? `${workerCount}+ ověřených profíků ${prep} ${loc} a okolí`
      : `Síť aktivních profíků ${prep} ${loc} a blízkém okolí`;

  const rows: { q: string; a: string }[] = [
    {
      q: `Kde rychle najdu profíka na ${categoryName} ${prep} ${loc}?`,
      a: `Na Zrobee — zadáte bezplatnou poptávku a do 24 hodin obvykle obdržíte první konkrétní nabídky od místních specialistů.`,
    },
    {
      q: `Kolik to stojí?`,
      a: `Cena závisí na rozsahu prací. Přes Zrobee porovnáte 3 a více nezávazných nabídek od profíků ${prep} ${loc} zdarma a bez registrace.`,
    },
    {
      q: `Jsou řemeslníci ověření?`,
      a: `Ano — ${countTxt}. Hodnocení (${ratingTxt}) i fotky realizací jsou veřejně viditelné na profilu každého profíka.`,
    },
    {
      q: `Jak rychle můžu mít hotovo?`,
      a: `Drobné zakázky se ${prep} ${loc} běžně řeší do několika dní, větší projekty do 2–4 týdnů podle dostupnosti materiálu a domluvy s profíkem.`,
    },
  ];

  return (
    <section
      aria-label={`Stručně k službě ${categoryName} ${prep} ${loc}`}
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      <div className="rounded-[2.5rem] border border-primary/15 bg-primary/[0.04] p-8 md:p-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <p className="text-xs md:text-sm font-black uppercase tracking-[0.2em] text-primary">
            Stručně — {categoryName} {prep} {loc}
          </p>
        </div>

        <dl className="divide-y divide-primary/10">
          {rows.map((r, i) => (
            <div key={i} className="py-4 md:py-5 grid md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2 md:gap-8">
              <dt className="text-sm md:text-base font-bold text-foreground leading-snug">
                {r.q}
              </dt>
              <dd className="text-sm md:text-base text-foreground/75 leading-relaxed m-0">
                {r.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};

export default AiOverviewSummary;
