import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  category_id: string;
}

interface CategorySelectorProps {
  selectedCategories: string[];
  onCategoryChange: (categoryId: string, checked: boolean) => void;
  categoryId?: string; // Optional filter by main category
}

const CategorySelector = ({ selectedCategories, onCategoryChange, categoryId }: CategorySelectorProps) => {
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['categories', categoryId],
    queryFn: async () => {
      let query = supabase
        .from('service_categories')
        .select('*')
        .order('name', { ascending: true });
      
      if (categoryId) {
        query = query.eq('id', categoryId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Category[];
    }
  });

  const { data: subcategories = [], isLoading: subcategoriesLoading } = useQuery<Subcategory[]>({
    queryKey: ['subcategories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_subcategories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Subcategory[];
    }
  });

  if (categoriesLoading || subcategoriesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {categories.map((category) => {
        const categorySubcategories = subcategories.filter(
          (sub) => sub.category_id === category.id
        );
        
        return (
          <div key={category.id} className="space-y-3">
            <h4 className="font-semibold text-foreground">{category.name}</h4>
            <div className="grid grid-cols-2 gap-3 pl-4">
              {categorySubcategories.map((subcategory) => (
                <div key={subcategory.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={subcategory.id}
                    checked={selectedCategories.includes(subcategory.id)}
                    onCheckedChange={(checked) => {
                      onCategoryChange(subcategory.id, checked as boolean);
                    }}
                  />
                  <Label
                    htmlFor={subcategory.id}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {subcategory.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CategorySelector;
