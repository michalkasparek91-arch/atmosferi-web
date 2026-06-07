import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddressAutocompleteInput, AddressSelectResult } from "../AddressAutocompleteInput";

const formSchema = z.object({
  title: z.string().min(3, "Nadpis je povinný"),
  categoryId: z.string().min(1, "Vyberte kategorii"),
  subcategoryId: z.string().min(1, "Vyberte službu"),
  description: z.string().min(10, "Popis musí mít alespoň 10 znaků"),
  city: z.string().min(1, "Město je povinné"),
  fullAddress: z.string().min(1, "Adresa je povinná"),
  budgetMin: z.coerce.number().optional().nullable(),
  budgetMax: z.coerce.number().optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface ConvertLeadToJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: {
    id: string;
    email: string;
    request_text: string | null;
  } | null;
  onSuccess: () => void;
}

export function ConvertLeadToJobDialog({
  open,
  onOpenChange,
  lead,
  onSuccess,
}: ConvertLeadToJobDialogProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      categoryId: "",
      subcategoryId: "",
      description: lead?.request_text || "",
      city: "",
      fullAddress: "",
      budgetMin: null,
      budgetMax: null,
    },
  });

  // Load categories on mount
  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase.from("service_categories").select("*").order("name");
      if (data) setCategories(data);
    }
    loadCategories();
  }, []);

  // Sync description when lead changes
  useEffect(() => {
    if (lead) {
      form.setValue("description", lead.request_text || "");
    }
  }, [lead, form]);

  // Load subcategories when category changes
  const selectedCategoryId = form.watch("categoryId");
  useEffect(() => {
    async function loadSubcategories() {
      if (!selectedCategoryId) {
        setSubcategories([]);
        return;
      }
      const { data } = await supabase
        .from("service_subcategories")
        .select("*")
        .eq("category_id", selectedCategoryId)
        .order("name");
      if (data) setSubcategories(data);
    }
    loadSubcategories();
  }, [selectedCategoryId]);

  // Auto-fill title when category/subcategory changes
  const selectedSubcategoryId = form.watch("subcategoryId");
  useEffect(() => {
    if (selectedCategoryId && selectedSubcategoryId && categories.length && subcategories.length) {
      const cat = categories.find((c) => c.id === selectedCategoryId);
      const sub = subcategories.find((s) => s.id === selectedSubcategoryId);
      if (cat && sub) {
        form.setValue("title", `${cat.name} - ${sub.name}`);
      }
    }
  }, [selectedCategoryId, selectedSubcategoryId, categories, subcategories, form]);

  const handleAddressSelect = (result: AddressSelectResult) => {
    form.setValue("city", result.city);
    form.setValue("fullAddress", `${result.streetName} ${result.streetNumber}, ${result.city}`.trim());
    setCoords({ lat: result.lat, lng: result.lng });
  };

  const onSubmit = async (data: FormData) => {
    if (!lead) return;
    setLoading(true);

    try {
      const { data: res, error } = await supabase.functions.invoke("convert-lead-to-job", {
        body: {
          leadId: lead.id,
          email: lead.email,
          jobData: {
            ...data,
            latitude: coords?.lat,
            longitude: coords?.lng,
          },
        },
      });

      if (error) throw error;

      toast.success(res.isNewUser 
        ? "Uživatel vytvořen a zakázka založena! 🎉" 
        : "Zakázka byla úspěšně vytvořena! 🎉"
      );
      
      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Nepodařilo se převést lead na zakázku");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Vytvořit zakázku z poptávky
          </DialogTitle>
          <DialogDescription>
            Poptávka od: <span className="font-medium text-foreground">{lead?.email}</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategorie</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subcategoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Služba</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={!selectedCategoryId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subcategories.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nadpis zakázky</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Název zakázky..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Popis</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Detailní popis práce..." 
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Lokalita (Geokódování)</FormLabel>
              <AddressAutocompleteInput 
                onSelect={handleAddressSelect}
                placeholder="Ulice, město..."
                className="w-full"
              />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} readOnly placeholder="Město" className="bg-muted text-xs h-8" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fullAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} readOnly placeholder="Celá adresa" className="bg-muted text-xs h-8" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="budgetMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rozpočet min (Kč)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="budgetMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rozpočet max (Kč)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Zrušit
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Vytvořit zakázku
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
