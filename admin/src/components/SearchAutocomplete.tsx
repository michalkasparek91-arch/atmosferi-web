import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

const getSupabase = () => import("@/integrations/supabase/client").then(m => m.supabase);
import { getCategoryIcon } from "@/utils/categoryIcons";
import { toast } from "sonner";

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

interface SearchAutocompleteProps {
  onSelect?: (subcategoryId: string, categoryId: string) => void;
  className?: string;
}

// Helper function to remove diacritics for search
const removeDiacritics = (str: string): string => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const SearchAutocomplete = ({ onSelect, className }: SearchAutocompleteProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredResults, setFilteredResults] = useState<Array<{type: 'category' | 'subcategory', item: Category | Subcategory}>>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholders = [
    "Zkus např. Instalatér, Účetní, Trenér...",
    "Hledám skládání nábytku IKEA...",
    "Potřebuji vyčistit okapy...",
    "Hledám seřízení plastových oken...",
    "Nouzové otevírání dveří...",
    "Oprava pračky nebo myčky...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('service_categories')
        .select('id, name, slug, icon')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Category[];
    }
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ['subcategories'],
    queryFn: async () => {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('service_subcategories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Subcategory[];
    }
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
        // 2. Word-based match (useful for "stavba domu" matching "stavba")
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
      
      const results = [...matchedSubcategories, ...matchedCategories];
      setFilteredResults(results);
      setShowSuggestions(true);
      setSelectedIndex(-1); 

      // If we have results, clear any previous AI stuff
      if (results.length > 0) {
        setAiSuggestion(null);
        setIsLoadingAI(false);
      }
    } else {
      setFilteredResults([]);
      setShowSuggestions(false);
      setAiSuggestion(null);
      setIsLoadingAI(false);
    }
  }, [searchTerm, categories, subcategories]);

  // Proactive AI suggestion when no results found
  useEffect(() => {
    if (searchTerm.length < 3 || filteredResults.length > 0 || isLoadingAI || aiSuggestion) {
      return;
    }

    const timer = setTimeout(() => {
      fetchAISuggestion();
    }, 1000); // 1s debounce after no results found

    return () => clearTimeout(timer);
  }, [searchTerm, filteredResults.length]);

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
    // Log search term
    if (searchTerm.trim()) {
      import('@/lib/analytics').then(({ analytics }) => {
        analytics.trackSearch(searchTerm.trim());
      });
    }

    // Only trigger AI if no regular results found
    if (filteredResults.length === 0 && searchTerm.trim()) {
      fetchAISuggestion();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) {
        const selected = filteredResults[selectedIndex];
        handleSelect(selected.item, selected.type);
      } else if (aiSuggestion) {
        handleAISelect();
      } else {
        handleSearch();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const normalizedText = removeDiacritics(text.toLowerCase());
    const normalizedQuery = removeDiacritics(query.toLowerCase());
    const index = normalizedText.indexOf(normalizedQuery);
    
    if (index === -1) return text;
    
    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);
    
    return (
      <>
        {before}
        <span className="font-bold text-primary">{match}</span>
        {after}
      </>
    );
  };

  const handleSelect = (item: Category | Subcategory, type: 'category' | 'subcategory') => {
    setSearchTerm(item.name);
    setShowSuggestions(false);
    setAiSuggestion(null);

    // Store the search term as initial description to pre-fill the demand form
    sessionStorage.setItem("ai_initial_description", searchTerm);

    // Log selection as a search event
    import('@/lib/analytics').then(({ analytics }) => {
      analytics.trackSearch(item.name);
    });

    if (onSelect && type === 'subcategory') {
      const subcategory = item as Subcategory;
      onSelect(subcategory.id, subcategory.category_id);
    } else if (onSelect && type === 'category') {
      // For category selection, navigate with just the category
      const category = item as Category;
      onSelect('', category.id);
    }
  };

  const handleAISelect = () => {
    if (!aiSuggestion) return;
    setSearchTerm(aiSuggestion.name);
    setShowSuggestions(false);
    setAiSuggestion(null);
    
    // Store the search term as initial description
    sessionStorage.setItem("ai_initial_description", searchTerm);

    if (onSelect) {
      onSelect(aiSuggestion.id, aiSuggestion.category_id);
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || '';
  };

  const getIcon = (iconName: string) => {
    return getCategoryIcon(iconName);
  };

  const getIconForCategory = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? getCategoryIcon(category.icon) : getCategoryIcon('Wrench');
  };

  return (
    <div className={"relative w-full max-w-2xl mx-auto " + (className ?? "")} ref={dropdownRef}>
      <div className="relative group flex items-center bg-white rounded-[2.5rem] p-1.5 transition-all border border-transparent focus-within:border-primary/40 focus-within:ring-0 focus-within:shadow-none">


        <div className="pl-4 pr-2 text-primary">
          <Sparkles className="h-5 w-5 animate-pulse" />
        </div>
        <Input
          type="text"
          placeholder={placeholders[placeholderIndex]}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className="flex-1 border-none bg-transparent focus-visible:ring-0 outline-none focus:outline-none focus-visible:outline-none text-base h-12 md:h-14 placeholder:text-muted-foreground/80 caret-dark-green"
        />
        <Button
          size="icon"
          onClick={handleSearch}
          disabled={isLoadingAI}
          aria-label="Vyhledat službu"
          className="rounded-full h-11 md:h-[54px] w-11 md:w-[54px] bg-dark-green hover:bg-dark-green/90 shadow-sm transition-all active:scale-95 flex items-center justify-center shrink-0 mr-0.5"
        >
          {isLoadingAI ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-primary" strokeWidth={3} />
          )}
        </Button>
      </div>
      
      {showSuggestions && (filteredResults.length > 0 || aiSuggestion || isLoadingAI) && (
        <div className="absolute top-full mt-2 w-full bg-card border-2 border-border rounded-2xl shadow-lg z-[100] max-h-[calc(100vh-280px)] overflow-y-auto">
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
              <div className="px-4 py-1.5 bg-primary/10 text-[12px] font-semibold text-primary uppercase flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                Navrhovaná služba
              </div>
              <button
                onClick={handleAISelect}
                className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    {(() => {
                      const Icon = getIconForCategory(aiSuggestion.category_id);
                      return <Icon className="h-4 w-4 text-foreground" />;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground text-sm">{aiSuggestion.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {getCategoryName(aiSuggestion.category_id)}
                    </div>
                  </div>
                </div>
                <div className="text-[12px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary flex-shrink-0 flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" />
                  AI návrh
                </div>
              </button>
            </>
          )}

          {/* No results message */}
          {!isLoadingAI && !aiSuggestion && filteredResults.length === 0 && searchTerm.length >= 3 && (
            <div className="px-4 py-6 text-center">
              <div className="flex justify-center mb-2">
                <Sparkles className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-foreground font-medium">Nenašli jsme přesnou shodu</p>
              <p className="text-xs text-muted-foreground mt-1 px-4">
                Zkuste hledat konkrétnější název služby nebo popište svůj problém jinými slovy.
              </p>
            </div>
          )}

          {/* Services section */}
          {filteredResults.filter(r => r.type === 'subcategory').length > 0 && (
            <>
              <div className="px-4 py-1.5 bg-muted/50 text-[12px] font-semibold text-foreground uppercase">
                Služby
              </div>
              {filteredResults.filter(r => r.type === 'subcategory').map((result, index) => {
                const globalIndex = index;
                const Icon = getIconForCategory((result.item as Subcategory).category_id);
                const isSelected = selectedIndex === globalIndex;
                
                return (
                  <button
                    key={`service-${index}`}
                    onClick={() => handleSelect(result.item, result.type)}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={`w-full px-4 py-2 text-left transition-colors flex items-center justify-between gap-2 ${
                      isSelected ? 'bg-accent border-l-4 border-primary' : 'hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Icon className="h-4 w-4 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground text-sm">
                          {highlightMatch(result.item.name, searchTerm)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getCategoryName((result.item as Subcategory).category_id)}
                        </div>
                      </div>
                    </div>
                    <div className="text-[12px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary flex-shrink-0">
                      Služba
                    </div>
                  </button>
                );
              })}
            </>
          )}
          
          {/* Categories section */}
          {filteredResults.filter(r => r.type === 'category').length > 0 && (
            <>
              <div className="px-4 py-1.5 bg-muted/50 text-[12px] font-semibold text-foreground uppercase">
                Kategorie
              </div>
              {filteredResults.filter(r => r.type === 'category').map((result, index) => {
                const subcategoryCount = filteredResults.filter(r => r.type === 'subcategory').length;
                const globalIndex = subcategoryCount + index;
                const Icon = getIcon((result.item as Category).icon);
                const isSelected = selectedIndex === globalIndex;
                
                return (
                  <button
                    key={`category-${index}`}
                    onClick={() => handleSelect(result.item, result.type)}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={`w-full px-4 py-2 text-left transition-colors flex items-center justify-between gap-2 ${
                      isSelected ? 'bg-accent border-l-4 border-primary' : 'hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Icon className="h-4 w-4 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground text-sm">
                          {highlightMatch(result.item.name, searchTerm)}
                        </div>
                      </div>
                    </div>
                    <div className="text-[12px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary flex-shrink-0">
                      Kategorie
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchAutocomplete;
