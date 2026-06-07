import { useNavigate, Link } from "react-router-dom";
import { safeGoBack } from "@/utils/navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronLeft } from "lucide-react";
import * as Icons from "lucide-react";
import Header from "@/components/Header";
import JsonLd from "@/components/JsonLd";
import { getSuperprominentBackgroundImage } from "@/config/superprominent";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import CitySelectorModal from "@/components/seo/CitySelectorModal";
import { useState } from "react";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  display_level: string | null;
  sort_order: number | null;
}

import { Button } from "@/components/ui/button";

const AllServices = () => {
  const navigate = useNavigate();
  const [selectedSubSlug, setSelectedSubSlug] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["all-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: subcategories = [], isLoading: subcategoriesLoading } = useQuery<Subcategory[]>({
    queryKey: ["all-subcategories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_subcategories")
        .select("*")
        .neq("display_level", "HIDDEN")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Subcategory[];
    },
  });

  const getIcon = (iconName: string) => {
    const Icon = Icons[iconName as keyof typeof Icons] as any;
    return Icon || Icons.Wrench;
  };

  const handleSubcategoryClick = (e: React.MouseEvent, subSlug: string) => {
    e.preventDefault();
    setSelectedSubSlug(subSlug);
    setIsModalOpen(true);
  };

  const isLoading = categoriesLoading || subcategoriesLoading;

  const sortedCategories = [...categories].sort((a, b) => {
    const countA = subcategories.filter((s) => s.category_id === a.id).length;
    const countB = subcategories.filter((s) => s.category_id === b.id).length;
    return countB - countA;
  });

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Domů", item: "https://zrobee.cz/" },
      { "@type": "ListItem", position: 2, name: "Všechny služby", item: "https://zrobee.cz/vsechny-sluzby" },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Katalog služeb Zrobee",
    itemListElement: sortedCategories.slice(0, 50).map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
    })),
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-background">
      <JsonLd data={breadcrumbJsonLd} id="all-services-breadcrumb" />
      <JsonLd data={itemListJsonLd} id="all-services-itemlist" />
      <div className="h-full overflow-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <Header />

        <div className="w-full px-4 md:px-8 lg:px-[150px] pt-6 md:pt-10 pb-24">
          <div className="max-w-4xl mx-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => safeGoBack(navigate, '/')}
              className="flex items-center gap-1 text-foreground mb-4 -ml-2 rounded-full px-3"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Zpět
            </Button>

            <div className="mb-6">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                Katalog služeb
              </p>
              <h1 className="text-2xl font-semibold text-foreground">Všechny kategorie</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Vyberte službu a vytvořte poptávku
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Accordion type="multiple" className="space-y-2">
                {sortedCategories.map((category) => {
                  const Icon = getIcon(category.icon);
                  const catSubcategories = subcategories.filter(
                    (s) => s.category_id === category.id
                  );

                  if (catSubcategories.length === 0) return null;

                  const prominent: Subcategory[] = [];
                  const standard: Subcategory[] = [];
                  catSubcategories.forEach((sub) => {
                    if (getSuperprominentBackgroundImage(sub.name)) {
                      prominent.push(sub);
                    } else {
                      standard.push(sub);
                    }
                  });

                  return (
                    <AccordionItem key={category.id} value={category.id} className="border rounded-xl px-4 bg-card">
                      <AccordionTrigger className="hover:no-underline py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Icon className="h-4.5 w-4.5 text-primary" />
                          </div>
                          <Link 
                            to={`/sluzby/${category.slug}`}
                            className="text-base font-semibold text-foreground hover:text-primary transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {category.name}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {catSubcategories.length} služeb
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pb-2">
                          {prominent.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                              {prominent.map((sub) => {
                                const bgImage = getSuperprominentBackgroundImage(sub.name);
                                return (
                                  <Link
                                    key={sub.id}
                                    to={`/sluzby/${category.slug}/${sub.slug}`}
                                    onClick={(e) => handleSubcategoryClick(e, sub.slug)}
                                    className="relative aspect-[3/4] rounded-2xl overflow-hidden group block"
                                  >
                                    <img
                                      src={bgImage!}
                                      alt={sub.name}
                                      loading="lazy"
                                      decoding="async"
                                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                                    <div className="absolute bottom-0 left-0 right-0 p-2.5">
                                      <span className="text-white text-xs font-medium leading-tight block text-left">
                                        {sub.name}
                                      </span>
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>
                          )}

                          {standard.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {standard.map((sub) => (
                                <Link
                                  key={sub.id}
                                  to={`/sluzby/${category.slug}/${sub.slug}`}
                                  onClick={(e) => handleSubcategoryClick(e, sub.slug)}
                                  className="text-left px-4 py-3 rounded-xl border border-border bg-background hover:bg-accent/50 hover:border-primary/30 transition-colors block"
                                >
                                  <span className="text-sm text-foreground">{sub.name}</span>
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
            <CitySelectorModal 
              isOpen={isModalOpen} 
              onClose={() => setIsModalOpen(false)} 
              categorySlug={selectedSubSlug || ""} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllServices;
