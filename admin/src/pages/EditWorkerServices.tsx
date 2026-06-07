import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2 } from "lucide-react";
import * as Icons from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { checkAndNotifyLowCredits } from "@/lib/low-credits-notification";

const EditWorkerServices = () => {
  const navigate = useNavigate();
  const { profile: userProfile } = useProfile();
  const [user, setUser] = useState<any>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [maxCategories, setMaxCategories] = useState(4);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);
  const userPoints = userProfile?.wallet_points ?? userProfile?.points ?? 0;

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/prihlaseni');
      return;
    }
    setUser(session.user);
    loadExistingServices(session.user.id);
  };

  const loadExistingServices = async (userId: string) => {
    const { data: services } = await supabase
      .from('worker_services')
      .select('subcategory_id, service_subcategories(category_id)')
      .eq('worker_id', userId);

    if (services && services.length > 0) {
      const categoryIds = [...new Set(services.map((s: any) => s.service_subcategories.category_id))];
      const subcategoryIds = services.map((s: any) => s.subcategory_id);
      
      setSelectedCategories(categoryIds);
      setSelectedSubcategories(subcategoryIds);
    }
  };

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['service-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: subcategories = [], isLoading: subcategoriesLoading } = useQuery({
    queryKey: ['service-subcategories', selectedCategories],
    queryFn: async () => {
      if (selectedCategories.length === 0) return [];
      
      const { data, error } = await supabase
        .from('service_subcategories')
        .select('*')
        .in('category_id', selectedCategories)
        .neq('display_level', 'HIDDEN')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: selectedCategories.length > 0
  });

  const getIcon = (iconName: string) => {
    const Icon = Icons[iconName as keyof typeof Icons] as any;
    return Icon || Icons.Wrench;
  };

  const handleCategoryToggle = (categoryId: string) => {
    const isSelected = selectedCategories.includes(categoryId);
    
    if (isSelected) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
      const newSubcategories = selectedSubcategories.filter(subId => {
        const subcategory = subcategories.find(s => s.id === subId);
        return subcategory?.category_id !== categoryId;
      });
      setSelectedSubcategories(newSubcategories);
    } else {
      if (selectedCategories.length >= maxCategories) {
        // Show upgrade dialog
        setPendingCategoryId(categoryId);
        setShowUpgradeDialog(true);
        return;
      }
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  const handlePurchaseExtraSlot = async () => {
    if (userPoints < 10) {
      toast.error("Nemáte dostatek bodů. Potřebujete 10 bodů.");
      setShowUpgradeDialog(false);
      return;
    }

    try {
      // Deduct points via RPC (auto-routes to business or profile)
      const { error } = await supabase.rpc('deduct_points', {
        p_user_id: user.id,
        p_amount: 10
      });

      if (error) throw error;

      setMaxCategories(5);
      
      // Add the pending category
      if (pendingCategoryId) {
        setSelectedCategories([...selectedCategories, pendingCategoryId]);
      }
      
      // Check and notify if low credits
      await checkAndNotifyLowCredits(user.id, userPoints - 10);
      
      toast.success("Extra kategorie byla úspěšně zakoupena!");
      setShowUpgradeDialog(false);
      setPendingCategoryId(null);
    } catch (error: any) {
      console.error('Error purchasing extra slot:', error);
      toast.error("Chyba při nákupu: " + error.message);
    }
  };

  const handleSubcategoryToggle = (subcategoryId: string) => {
    const isSelected = selectedSubcategories.includes(subcategoryId);
    
    if (isSelected) {
      setSelectedSubcategories(selectedSubcategories.filter(id => id !== subcategoryId));
    } else {
      setSelectedSubcategories([...selectedSubcategories, subcategoryId]);
    }
  };

  const handleSave = async () => {
    if (selectedSubcategories.length === 0) {
      toast.error("Vyberte alespoň jeden typ práce");
      return;
    }

    setSaving(true);
    try {
      // Delete existing services
      await supabase
        .from('worker_services')
        .delete()
        .eq('worker_id', user.id);

      // Save new selected services
      const servicesToInsert = selectedSubcategories.map(subcategoryId => ({
        worker_id: user.id,
        subcategory_id: subcategoryId
      }));

      const { error } = await supabase
        .from('worker_services')
        .insert(servicesToInsert);

      if (error) throw error;

      toast.success("Typy prací byly úspěšně aktualizovány!");
      navigate('/remeslnik/profil');
    } catch (error: any) {
      console.error('Error updating services:', error);
      toast.error("Chyba při aktualizaci: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Přidat další kategorii práce?</AlertDialogTitle>
            <AlertDialogDescription>
              Chcete přidat pátou kategorii práce? Stojí to 10 bodů.
              <br />
              <br />
              Vaše aktuální body: <strong>{userPoints}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowUpgradeDialog(false);
              setPendingCategoryId(null);
            }}>
              Zrušit
            </AlertDialogCancel>
            <AlertDialogAction onClick={handlePurchaseExtraSlot}>
              Koupit za 10 bodů
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="h-full overflow-auto bg-background p-6">
        <div className="max-w-5xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/remeslnik/profil')}
          className="mb-4 rounded-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zpět na profil
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Upravit typy prací</CardTitle>
            <p className="text-sm text-muted-foreground">
              Vyberte maximálně 4 kategorie a pak neomezený počet konkrétních prací
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Categories */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Kategorie prací</h3>
              {categoriesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {categories.map((category) => {
                    const Icon = getIcon(category.icon);
                    const isSelected = selectedCategories.includes(category.id);
                    
                    return (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryToggle(category.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all cursor-pointer group whitespace-nowrap ${
                          isSelected 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-card hover:bg-primary border border-border'
                        }`}
                      >
                        <Icon className={`h-4 w-4 flex-shrink-0 transition-colors ${
                          isSelected ? 'text-primary-foreground' : 'text-foreground group-hover:text-primary-foreground'
                        }`} />
                        <span className={`text-sm font-medium truncate transition-colors ${
                          isSelected ? 'text-primary-foreground' : 'text-foreground group-hover:text-primary-foreground'
                        }`}>
                          {category.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Subcategories */}
            {selectedCategories.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Konkrétní typy prací</h3>
                {subcategoriesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {categories
                      .filter(cat => selectedCategories.includes(cat.id))
                      .map(category => {
                        const categorySubcategories = subcategories.filter(
                          sub => sub.category_id === category.id
                        );
                        
                        if (categorySubcategories.length === 0) return null;
                        
                        return (
                          <div key={category.id} className="space-y-3">
                            <h4 className="font-semibold text-foreground">{category.name}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {categorySubcategories.map(subcategory => (
                                <div
                                  key={subcategory.id}
                                  className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                                >
                                  <Checkbox
                                    id={subcategory.id}
                                    checked={selectedSubcategories.includes(subcategory.id)}
                                    onCheckedChange={() => handleSubcategoryToggle(subcategory.id)}
                                  />
                                  <label
                                    htmlFor={subcategory.id}
                                    className="text-sm font-medium leading-none cursor-pointer flex-1"
                                  >
                                    {subcategory.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => navigate('/remeslnik/profil')}
              >
                Zrušit
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || selectedSubcategories.length === 0}
                className="rounded-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ukládání...
                  </>
                ) : (
                  "Uložit změny"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  );
};

export default EditWorkerServices;
