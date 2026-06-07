import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getCategoryIcon, getCategoryIconBySlug } from "@/utils/categoryIcons";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import FavoriteServicesGrid from "@/components/FavoriteServicesGrid";

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
  search_terms?: string[] | null;
}

interface AISuggestion {
  id: string;
  name: string;
  category_id: string;
}


// Helper function to remove diacritics for search
const removeDiacritics = (str: string): string => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const CustomerHome = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [filteredResults, setFilteredResults] = useState<Array<{type: 'category' | 'subcategory', item: Category | Subcategory}>>([]);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('id, name, slug, icon');
      if (error) throw error;
      return data as Category[];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - categories rarely change
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ['subcategories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_subcategories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Subcategory[];
    },
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (!categories.length || !subcategories.length) return;
    
    if (searchTerm.length > 0) {
      const term = removeDiacritics(searchTerm.toLowerCase()).trim();
      const termWords = term.split(/\s+/).filter(w => w.length > 1);
      
      const hasMatch = (target: string) => {
        const normalizedTarget = removeDiacritics(target.toLowerCase());
        // 1. Full match (bidirectional)
        if (normalizedTarget.includes(term) || term.includes(normalizedTarget)) return true;
        // 2. Word-based match
        if (termWords.length > 0 && termWords.some(word => normalizedTarget.includes(word))) return true;
        return false;
      };

      const matchedCategories = categories
        .filter(cat => hasMatch(cat.name))
        .map(cat => ({ type: 'category' as const, item: cat }));
      
      const matchedSubcategories = subcategories
        .filter(sub => {
          const nameMatch = hasMatch(sub.name);
          const termsMatch = sub.search_terms?.some(t => hasMatch(t));
          return nameMatch || termsMatch;
        })
        .map(sub => ({ type: 'subcategory' as const, item: sub }));
      
      setFilteredResults([...matchedSubcategories, ...matchedCategories]);
      setShowSuggestions(true);
      // Clear AI suggestion when there are regular results
      if (matchedSubcategories.length > 0 || matchedCategories.length > 0) {
        setAiSuggestion(null);
      }
    } else {
      setFilteredResults([]);
      setShowSuggestions(false);
      setAiSuggestion(null);
    }
  }, [searchTerm, categories, subcategories]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAISuggestion = async () => {
    if (!searchTerm.trim() || filteredResults.length > 0) return;
    
    setIsLoadingAI(true);
    setShowSuggestions(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-suggestion`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ searchTerm: searchTerm.trim() }),
        }
      );

      if (response.status === 429) {
        toast.error("Příliš mnoho požadavků. Zkuste to prosím později.");
        return;
      }

      if (response.status === 402) {
        toast.error("Služba není momentálně dostupná.");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to get AI suggestion");
      }

      const data = await response.json();
      
      if (data.suggestion) {
        setAiSuggestion(data.suggestion);
      } else {
        setAiSuggestion(null);
        toast.info("Nepodařilo se najít odpovídající službu.");
      }
    } catch (error) {
      console.error("AI suggestion error:", error);
      toast.error("Nepodařilo se získat návrh služby.");
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleSearch = () => {
    // Only trigger AI if no regular results found
    if (filteredResults.length === 0 && searchTerm.trim()) {
      fetchAISuggestion();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || '';
  };

  const getCategoryIconById = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return getCategoryIcon('');
    return category.icon ? getCategoryIcon(category.icon) : getCategoryIconBySlug(category.slug);
  };

  const handleServiceSelect = (subcategoryId: string, categoryId: string) => {
    navigate(`/nova-poptavka?category=${categoryId}&subcategory=${subcategoryId}`);
  };

  const handleSelect = (item: Category | Subcategory, type: 'category' | 'subcategory') => {
    setSearchTerm(item.name);
    setShowSuggestions(false);
    setAiSuggestion(null);
    if (type === 'subcategory') {
      const subcategory = item as Subcategory;
      handleServiceSelect(subcategory.id, subcategory.category_id);
    } else {
      const category = item as Category;
      navigate(`/nova-poptavka?category=${category.id}`);
    }
  };

  const handleAISelect = () => {
    if (!aiSuggestion) return;
    setSearchTerm(aiSuggestion.name);
    setShowSuggestions(false);
    setAiSuggestion(null);
    handleServiceSelect(aiSuggestion.id, aiSuggestion.category_id);
  };

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/nova-poptavka?category=${categoryId}`);
  };

  // Sort categories by number of subcategories (most first)
  const sortedCategories = [...categories].sort((a, b) => {
    const countA = subcategories.filter(sub => sub.category_id === a.id).length;
    const countB = subcategories.filter(sub => sub.category_id === b.id).length;
    return countB - countA;
  });

  const displayedCategories = showAllCategories ? sortedCategories : sortedCategories.slice(0, 8);

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-5xl">
        {/* Centered content - matching HeroSection */}
        <div className="text-center">
          <h1 className="text-[2rem] md:text-[2.5rem] font-bold text-foreground dark:text-sidebar-foreground mb-6 leading-tight pt-12 md:pt-16 px-4 tracking-tight">
            S čím dnes<br />potřebujete píchnout?
          </h1>

          {/* Search bar - sticky below header */}
          <div className="sticky top-[73px] z-30 bg-background pb-3 px-4">
            <div className="w-full max-w-2xl mx-auto relative" ref={dropdownRef}>
              <Input
                type="text"
                placeholder="zkuste např. malování pokoje, výuka angličtiny,..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm && setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                autoFocus={typeof window !== 'undefined' && window.innerWidth > 768}
                className="h-14 pl-5 pr-14 text-base rounded-full bg-card border border-primary text-foreground placeholder:text-muted-foreground placeholder:text-xs focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-2 focus-visible:border-primary shadow-sm"
              />
              <Button
                size="icon"
                onClick={handleSearch}
                disabled={isLoadingAI}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-primary hover:bg-primary/90"
              >
                {isLoadingAI ? (
                  <Loader2 className="h-5 w-5 text-primary-foreground animate-spin" />
                ) : (
                  <Search className="h-5 w-5 text-primary-foreground" />
                )}
              </Button>

              {/* Search Suggestions - inside dropdownRef so clicks register */}
              {showSuggestions && (filteredResults.length > 0 || aiSuggestion || isLoadingAI) && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-card border-2 border-border rounded-2xl shadow-lg z-[100] max-h-[calc(100vh-280px)] overflow-y-auto">
                {/* AI Loading state */}
                {isLoadingAI && filteredResults.length === 0 && (
                  <div className="px-4 py-4 flex items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Hledám odpovídající službu...</span>
                  </div>
                )}

                {/* AI Suggestion */}
                {aiSuggestion && !isLoadingAI && filteredResults.length === 0 && (
                  <>
                    <div className="px-4 py-1.5 bg-primary/10 text-[10px] font-semibold text-primary uppercase flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" />
                      Navrhovaná služba
                    </div>
                    <button
                      onClick={handleAISelect}
                      className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-center justify-between gap-2 group"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {(() => {
                          const Icon = getCategoryIconById(aiSuggestion.category_id);
                          return <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-accent-foreground" />;
                        })()}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground text-sm group-hover:text-accent-foreground">{aiSuggestion.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {getCategoryName(aiSuggestion.category_id)}
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary flex-shrink-0 flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5" />
                        AI návrh
                      </div>
                    </button>
                  </>
                )}

                {/* Regular results */}
                {filteredResults.slice(0, 8).map((result, index) => {
                  const Icon = result.type === 'category' 
                    ? getCategoryIcon((result.item as Category).icon)
                    : getCategoryIconById((result.item as Subcategory).category_id);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleSelect(result.item, result.type)}
                      className="w-full px-4 py-2 text-left hover:bg-accent transition-colors flex items-center gap-2 group"
                    >
                      <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-accent-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground text-sm group-hover:text-accent-foreground">{result.item.name}</div>
                        {result.type === 'subcategory' && (
                          <div className="text-xs text-muted-foreground">
                            {getCategoryName((result.item as Subcategory).category_id)}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Category Buttons - 2 columns on mobile, 4 on desktop */}
        <div className="mt-12 max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {categoriesLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-full bg-card shadow-md h-[42px]">
                  <div className="flex-shrink-0 w-5 h-5">
                    <Skeleton className="h-4 w-4" />
                  </div>
                  <Skeleton className="h-3.5 w-full" />
                </div>
              ))
            ) : displayedCategories.map((category) => {
              const Icon = category.icon ? getCategoryIcon(category.icon) : getCategoryIconBySlug(category.slug);
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className="group flex items-center gap-2.5 px-3 py-2.5 rounded-full bg-card hover:bg-primary transition-all shadow-md hover:shadow-lg h-[42px]"
                >
                  <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-foreground group-hover:text-accent-foreground" />
                  </div>
                  <div className="flex-1 text-left min-w-0 overflow-hidden">
                    <div className="font-medium text-foreground text-xs leading-tight line-clamp-2 group-hover:text-accent-foreground">
                      {category.name}
                    </div>
                  </div>
                </button>
              );
            })
            }
          </div>
          
          {/* Show more/less toggle */}
          {sortedCategories.length > 8 && (
            <button
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAllCategories ? (
                <>
                  Zobrazit méně
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  Zobrazit další
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>

        {/* Favorite Services Grid */}
        <div className="mt-8 px-4">
          <FavoriteServicesGrid />
        </div>
      </div>
    </div>
  );
};

export default CustomerHome;
