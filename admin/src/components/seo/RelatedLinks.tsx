import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export interface RelatedLink {
  to: string;
  label: string;
  description?: string;
}

interface RelatedLinksProps {
  title?: string;
  links: RelatedLink[];
  className?: string;
}

/**
 * Reusable "Související" block for SEO landing pages.
 *
 * Solves the Ahrefs "orphan pages" / "page has no outgoing internal links"
 * warnings by guaranteeing every indexable page links onward to at least
 * 3-5 sibling pages. Also boosts crawl depth and topical relevance.
 */
const RelatedLinks = ({ title = "Související stránky", links, className = "" }: RelatedLinksProps) => {
  const filtered = links.filter((l) => l && l.to && l.label);
  if (filtered.length === 0) return null;

  return (
    <section className={`mt-16 pt-12 border-t border-border ${className}`} aria-labelledby="related-links-heading">
      <h2 id="related-links-heading" className="text-2xl font-black uppercase tracking-tight mb-6">
        {title}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              className="group flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/50 hover:text-primary transition-all"
            >
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight">{l.label}</span>
                {l.description && (
                  <span className="mt-1 block text-xs text-muted-foreground line-clamp-2">{l.description}</span>
                )}
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default RelatedLinks;
