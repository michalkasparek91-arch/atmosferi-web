import { buildLocalSeoFaqs } from "./localSeoFaq";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface LocalSeoFaqProps {
  categoryName: string;
  cityName: string;
}

const LocalSeoFaq = ({ categoryName, cityName }: LocalSeoFaqProps) => {
  const faqs = buildLocalSeoFaqs(categoryName, cityName);

  if (!faqs || faqs.length === 0) return null;

  return (
    <section id="faq-section" className="rounded-[3rem] border border-border/40 bg-background p-8 md:p-14 shadow-none">
      <div className="mb-10">
        <p className="text-sm font-bold uppercase tracking-widest text-primary">Než zadáte poptávku</p>
        <h3 className="mt-3 text-3xl md:text-5xl font-extrablack uppercase tracking-tight text-foreground">Časté otázky</h3>
      </div>
      
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((item, index) => (
          <AccordionItem key={index} value={`item-${index}`} className="border-border/40">
            <AccordionTrigger className="text-left text-lg md:text-xl font-bold text-foreground hover:text-primary transition-colors py-6">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-foreground/80 leading-relaxed text-base md:text-lg pb-8">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};

export default LocalSeoFaq;
