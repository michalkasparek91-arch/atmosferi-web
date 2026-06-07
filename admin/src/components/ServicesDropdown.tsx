import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { getCategoryIcon, getCategoryIconBySlug } from "@/utils/categoryIcons";

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  slug: string;
}

interface ServicesDropdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ServicesDropdown = ({ open, onOpenChange }: ServicesDropdownProps) => {
  const navigate = useNavigate();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["service-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as ServiceCategory[];
    },
  });

  const getIcon = (category: ServiceCategory) => {
    return category.icon ? getCategoryIcon(category.icon) : getCategoryIconBySlug(category.slug);
  };

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/nova-poptavka?category=${categoryId}`);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <>
      <div 
        className="fixed top-[73px] left-0 right-0 bottom-0 z-40 bg-background/80"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed top-[73px] left-0 right-0 bottom-0 z-50 bg-background overflow-y-auto pointer-events-none">
        <div className="container mx-auto px-8 md:px-16 lg:px-24 py-12 pointer-events-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {isLoading ? (
              <>
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-muted animate-pulse rounded-full"
                  />
                ))}
              </>
            ) : (
              categories?.map((category) => {
                const Icon = getIcon(category);
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.id)}
                    className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-card hover:bg-primary transition-all cursor-pointer group whitespace-nowrap shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-foreground group-hover:text-primary-foreground transition-colors" />
                    </div>
                    <span className="text-sm font-medium text-foreground group-hover:text-primary-foreground transition-colors truncate">
                      {category.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ServicesDropdown;
