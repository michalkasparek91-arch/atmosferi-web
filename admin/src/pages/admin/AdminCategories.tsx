import { useState, useEffect, useCallback, ChangeEvent, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Pencil, Search, Upload, FolderTree, ChevronRight, ChevronDown, FileUp, FileDown, Plus, Sparkles, Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { getCategoryIconBySlug } from "@/utils/categoryIcons";

interface SubcategoryRow {
  id: string;
  name: string;
  slug: string;
  category_form: string | null;
  search_terms: string[] | null;
  supply: number;
  demand: number;
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  image_url?: string | null;
  subcategory_count: number;
  supply: number;
  demand: number;
  subcategories: SubcategoryRow[];
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedCats, setExpandedCats] = useState<string[]>([]);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoryRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  
  // Subcategory edit state
  const [subEditOpen, setSubEditOpen] = useState(false);
  const [editSub, setEditSub] = useState<SubcategoryRow | null>(null);
  const [editSubCatId, setEditSubCatId] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState("");
  const [editSubSlug, setEditSubSlug] = useState("");
  const [editSubForm, setEditSubForm] = useState("");
  const [editSubSearchTerms, setEditSubSearchTerms] = useState("");
  const [subSaving, setSubSaving] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [batchGeneratingAi, setBatchGeneratingAi] = useState(false);
  
  const globalFileInputRef = useRef<HTMLInputElement>(null);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch categories
      const { data: cats, error } = await supabase
        .from("service_categories")
        .select("id, name, slug, icon, description")
        .order("name");

      if (error) throw error;
      if (!cats) return;

      // Fetch subcategory counts
      const { data: subCounts, error: scErr } = await supabase
        .from("service_subcategories")
        .select("category_id");
      if (scErr) throw scErr;

      // Fetch supply (worker_services joined with subcategories)
      const { data: workerServices, error: wsErr } = await supabase
        .from("worker_services")
        .select("subcategory_id");
      if (wsErr) throw wsErr;

      let allSubsData = null;
      let allSubsError = null;

      // Primary fetch with category_form
      const result = await supabase
        .from("service_subcategories")
        .select("id, category_id, name, slug, category_form, search_terms");
      
      allSubsData = result.data;
      allSubsError = result.error;

      // Fallback if category_form is missing (column doesn't exist yet)
      if (allSubsError && allSubsError.message.includes("category_form")) {
        console.warn("Falling back: category_form column not found in database.");
        const fallbackResult = await supabase
          .from("service_subcategories")
          .select("id, category_id, name, slug");
        
        allSubsData = fallbackResult.data;
        allSubsError = fallbackResult.error;
      }

      if (allSubsError) throw allSubsError;
      const allSubs = allSubsData;

      // Fetch demand (active jobs per category)
      const { data: activeJobs, error: ajErr } = await supabase
        .from("jobs")
        .select("category_id, subcategory_id")
        .in("status", ["open", "in_progress"]);
      if (ajErr) throw ajErr;

      // Build lookup maps
      const subCountMap: Record<string, number> = {};
      (subCounts || []).forEach((s: any) => {
        subCountMap[s.category_id] = (subCountMap[s.category_id] || 0) + 1;
      });

      // Map subcategory_id → category_id
      const subToCat: Record<string, string> = {};
      (allSubs || []).forEach((s: any) => {
        subToCat[s.id] = s.category_id;
      });

      // Calculate subcategory-level metrics
      const subSupplyMap: Record<string, number> = {};
      (workerServices || []).forEach((ws: any) => {
        subSupplyMap[ws.subcategory_id] = (subSupplyMap[ws.subcategory_id] || 0) + 1;
      });

      const subDemandMap: Record<string, number> = {};
      (activeJobs || []).forEach((j: any) => {
        if (j.subcategory_id) {
          subDemandMap[j.subcategory_id] = (subDemandMap[j.subcategory_id] || 0) + 1;
        }
      });

      const supplyMap: Record<string, number> = {};
      Object.entries(subSupplyMap).forEach(([subId, count]) => {
        const catId = subToCat[subId];
        if (catId) supplyMap[catId] = (supplyMap[catId] || 0) + 1;
      });

      const demandMap: Record<string, number> = {};
      (activeJobs || []).forEach((j: any) => {
        demandMap[j.category_id] = (demandMap[j.category_id] || 0) + 1;
      });

      const enriched: CategoryRow[] = cats.map((c: any) => {
        const catSubs = (allSubs || [])
          .filter((s: any) => s.category_id === c.id)
          .map((s: any) => ({
            id: s.id,
            name: s.name,
            slug: s.slug,
            category_form: s.category_form,
            search_terms: s.search_terms,
            supply: subSupplyMap[s.id] || 0,
            demand: subDemandMap[s.id] || 0,
          }));

        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          icon: c.icon,
          description: c.description,
          subcategory_count: catSubs.length,
          supply: supplyMap[c.id] || 0,
          demand: demandMap[c.id] || 0,
          subcategories: catSubs,
        };
      });

      setCategories(enriched);
    } catch (err: any) {
      toast.error("Chyba při načítání kategorií: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function importGlobalCSV(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const lines = content.split("\n").filter(l => l.trim());
      if (lines.length <= 1) return;

      const dataRows = lines.slice(1);
      setLoading(true);
      try {
        let updateCount = 0;
        for (const row of dataRows) {
          // Robust CSV parsing for quoted values
          const parts = row.match(/(".*?"|[^,]+)/g)?.map(p => p.trim().replace(/^"|"$/g, "")) || [];
          if (parts.length < 5) continue;

          const [id, type, name, slug, categoryForm, searchTerms] = parts;
          
          // Skip if essential data is missing to prevent accidental blanking of names
          if (!name || !slug) continue;

          if (id && type === "Podkategorie") {
             const { error } = await supabase
              .from("service_subcategories")
              .update({
                name: name,
                slug: slug,
                category_form: categoryForm || null,
                search_terms: searchTerms ? searchTerms.split(";").map(t => t.trim()).filter(t => t) : []
              })
              .eq("id", id);
            
            if (error) throw error;
            updateCount++;
          } else if (id && type === "Kategorie") {
             const { error } = await supabase
              .from("service_categories")
              .update({
                name: name,
                slug: slug
              })
              .eq("id", id);
            
            if (error) throw error;
            updateCount++;
          }
        }
        toast.success(`Hromadná aktualizace dokončena: ${updateCount} položek upraveno`);
        fetchData();
      } catch (err: any) {
        toast.error("Chyba při hromadném importu: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  // Global CSV Export (Categories + Subcategories)
  function exportCSV() {
    const header = "ID,Typ,Název,Slug,Skloněný tvar (category_form),Vyhledávací termíny (search_terms),Supply,Demand\n";
    const dataRows: string[] = [];

    filtered.forEach(c => {
      // Add category row
      dataRows.push(`"${c.id}","Kategorie","${c.name}","${c.slug}","","",${c.supply},${c.demand}`);
      
      // Add subcategory rows
      c.subcategories.forEach(s => {
        const terms = s.search_terms ? s.search_terms.join("; ") : "";
        dataRows.push(`"${s.id}","Podkategorie","${s.name}","${s.slug}","${s.category_form || ""}","${terms}",${s.supply},${s.demand}`);
      });
    });

    const csv = header + dataRows.join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kategorie-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Kompletní export (včetně podkategorií) dokončen");
  }

  // CSV Export for a single category
  function exportCategoryCSV(cat: CategoryRow) {
    const header = "Název,Slug,Skloněný tvar (category_form),Vyhledávací termíny (search_terms)\n";
    const rows = cat.subcategories.map(
      (s) => `"${s.name}","${s.slug}","${s.category_form || ""}","${s.search_terms ? s.search_terms.join("; ") : ""}"`
    );
    const csv = header + rows.join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kategorie-${cat.slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV kategorie exportováno");
  }

  // CSV Import for a single category
  async function handleImportCSV(cat: CategoryRow, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split("\n").filter(l => l.trim() !== "");
      // Skip header
      const dataRows = lines.slice(1);
      
      try {
        setLoading(true);
        for (const row of dataRows) {
          // Semi-naive CSV parsing (handles quotes if they are simple)
          const parts = row.match(/(".*?"|[^,]+)/g)?.map(p => p.trim().replace(/^"|"$/g, "")) || [];
          if (parts.length >= 2) {
            const [name, slug, categoryForm, searchTerms] = parts;
            if (name && slug) {
              const { error } = await supabase
                .from("service_subcategories")
                .upsert({
                  category_id: cat.id,
                  name: name,
                  slug: slug,
                  category_form: categoryForm || null,
                  search_terms: searchTerms ? searchTerms.split(";").map(t => t.trim()).filter(t => t) : []
                }, { onConflict: "slug" });
              
              if (error) throw error;
            }
          }
        }
        toast.success(`Import podkategorií pro ${cat.name} dokončen`);
        fetchData();
      } catch (err: any) {
        toast.error("Chyba při importu: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = "";
  }

  function toggleExpand(id: string) {
    setExpandedCats(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }

  // Open edit dialog
  function openEdit(cat: CategoryRow) {
    setEditCategory(cat);
    setEditName(cat.name);
    setEditDescription(cat.description || "");
    setEditSlug(cat.slug);
    setEditIcon(cat.icon);
    setImageFile(null);
    setImagePreview(null);
    setEditOpen(true);
  }

  // Handle image file selection
  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  // Save edit
  async function handleSave() {
    if (!editCategory) return;
    setSaving(true);
    try {
      let iconValue = editIcon;

      // Upload image if selected
      if (imageFile) {
        setUploading(true);
        const ext = imageFile.name.split(".").pop();
        const path = `${editCategory.id}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("category-images")
          .upload(path, imageFile, { upsert: true });
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from("category-images")
          .getPublicUrl(path);
        // Store the public URL in the icon field or a separate field as needed
        iconValue = editIcon; // Keep icon name, image is separate
        setUploading(false);
      }

      const { error } = await supabase
        .from("service_categories")
        .update({
          name: editName,
          description: editDescription || null,
          slug: editSlug,
          icon: iconValue,
        })
        .eq("id", editCategory.id);

      if (error) throw error;

      toast.success("Kategorie uložena");
      setEditOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error("Chyba při ukládání: " + err.message);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  function openAddSub(catId: string) {
    setEditSub(null);
    setEditSubCatId(catId);
    setEditSubName("");
    setEditSubSlug("");
    setEditSubForm("");
    setEditSubSearchTerms("");
    setSubEditOpen(true);
  }

  function openEditSub(sub: SubcategoryRow, catId: string) {
    setEditSub(sub);
    setEditSubCatId(catId);
    setEditSubName(sub.name);
    setEditSubSlug(sub.slug);
    setEditSubForm(sub.category_form || "");
    setEditSubSearchTerms(sub.search_terms ? sub.search_terms.join(", ") : "");
    setSubEditOpen(true);
  }

  async function handleSaveSub() {
    if (!editSubCatId) return;
    setSubSaving(true);
    try {
      const subData = {
        name: editSubName,
        slug: editSubSlug,
        category_id: editSubCatId,
        category_form: editSubForm || null,
        search_terms: editSubSearchTerms.split(",").map(t => t.trim()).filter(t => t),
      };

      let error;
      if (editSub) {
        const { error: updateError } = await supabase
          .from("service_subcategories")
          .update(subData)
          .eq("id", editSub.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("service_subcategories")
          .insert(subData);
        error = insertError;
      }

      if (error) throw error;

      toast.success(editSub ? "Podkategorie uložena" : "Podkategorie vytvořena");
      setSubEditOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error("Chyba při ukládání: " + err.message);
    } finally {
      setSubSaving(false);
    }
  }

  async function handleGenerateSingleForm() {
    if (!editSubName) {
      toast.error("Zadejte prosím nejdříve název podkategorie");
      return;
    }
    setGeneratingAi(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-category-form", {
        body: { subcategoryName: editSubName }
      });
      if (error) throw error;
      if (data?.form) {
        setEditSubForm(data.form);
        toast.success("Tvar úspěšně vygenerován");
      } else {
        throw new Error(data?.error || "Nepodařilo se vygenerovat tvar");
      }
    } catch (err: any) {
      toast.error("Chyba AI generátoru: " + err.message);
    } finally {
      setGeneratingAi(false);
    }
  }

  async function handleBatchGenerateForms(forceAll: boolean = false) {
    const targetSubs: SubcategoryRow[] = [];
    categories.forEach(c => {
      c.subcategories.forEach(s => {
        if (forceAll || !s.category_form || s.category_form.trim() === "") {
          targetSubs.push(s);
        }
      });
    });

    if (targetSubs.length === 0) {
      toast.success(forceAll ? "Nebyly nalezeny žádné podkategorie ke zpracování." : "Všechny podkategorie už mají skloněný tvar vyplněný!");
      return;
    }

    setBatchGeneratingAi(true);
    const modeText = forceAll ? "Kontrola a oprava všech" : "Doplnění chybějících";
    const toastId = toast.loading(`${modeText} (${targetSubs.length} podkategorií)...`);
    try {
      const chunkSize = 40;
      let updatedCount = 0;
      
      for (let i = 0; i < targetSubs.length; i += chunkSize) {
        const chunk = targetSubs.slice(i, i + chunkSize);
        toast.loading(`${modeText} (${i + 1} - ${Math.min(i + chunkSize, targetSubs.length)} z ${targetSubs.length})...`, { id: toastId });
        
        const batchItems = chunk.map(s => ({ id: s.id, name: s.name }));
        const { data, error } = await supabase.functions.invoke("generate-category-form", {
          body: { batch: batchItems }
        });

        if (error) throw error;
        if (data?.results && Array.isArray(data.results)) {
          for (const res of data.results) {
            if (res.id && res.form) {
              const { error: updateErr } = await supabase
                .from("service_subcategories")
                .update({ category_form: res.form })
                .eq("id", res.id);
              if (!updateErr) updatedCount++;
            }
          }
        }
      }
      
      toast.success(`Úspěšně zpracováno a uloženo ${updatedCount} z ${targetSubs.length} podkategorií!`, { id: toastId });
      fetchData();
    } catch (err: any) {
      toast.error("Chyba při AI hromadném skloňování: " + err.message, { id: toastId });
    } finally {
      setBatchGeneratingAi(false);
    }
  }

  function renderIcon(iconName: string) {
    const Icon = getCategoryIconBySlug(iconName);
    return Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null;
  }

  return (
    <div className="space-y-6">
        <AdminPageHeader
          icon={FolderTree}
          title="Kategorie"
          subtitle="Správa oborů a kategorií služeb"
          actions={
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleBatchGenerateForms(false)}
                disabled={loading || batchGeneratingAi}
                variant="outline"
                size="sm"
                className="h-8 rounded-full text-[10px] font-bold px-3 border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 cursor-pointer shadow-none"
                title="Doplnit tvary jen u podkategorií, kde chybí"
              >
                {batchGeneratingAi ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5 text-amber-500" />}
                <span className="hidden sm:inline">✨ AI skloňování (Doplnit)</span>
                <span className="sm:hidden">✨ Doplnit</span>
              </Button>
              <Button
                onClick={() => handleBatchGenerateForms(true)}
                disabled={loading || batchGeneratingAi}
                variant="outline"
                size="sm"
                className="h-8 rounded-full text-[10px] font-bold px-3 border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 cursor-pointer shadow-none"
                title="Zkontrolovat a opravit všechny podkategorie"
              >
                {batchGeneratingAi ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />}
                <span className="hidden sm:inline">✨ AI oprava (Přegenerovat vše)</span>
                <span className="sm:hidden">✨ Opravit vše</span>
              </Button>
              <input
                type="file"
                accept=".csv"
                onChange={importGlobalCSV}
                ref={globalFileInputRef}
                className="hidden"
              />
              <Button 
                onClick={() => globalFileInputRef.current?.click()} 
                disabled={loading} 
                variant="ghost" 
                size="sm"
                className="h-8 rounded-full text-[10px] font-medium px-4 bg-muted/50 hover:bg-muted border border-border transition-all"
              >
                <Upload className="h-3.5 w-3.5 mr-2 opacity-60" />
                Import
              </Button>
              <Button 
                onClick={exportCSV} 
                variant="default" 
                size="sm"
                className="h-8 rounded-full text-[10px] font-medium px-4 shadow-sm hover:shadow-md transition-all"
              >
                <Download className="h-3.5 w-3.5 mr-2 opacity-80" />
                Export
              </Button>
            </div>
          }
        />

      <Card>
        <CardHeader className="pb-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <Input
              placeholder="Rychlé hledání v kategoriích..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-[10px] font-medium bg-slate-50/50 dark:bg-slate-900/50 border-border"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-border/50">
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="text-[10px] h-8 font-medium text-muted-foreground/70">Kategorie / Podkategorie</TableHead>
                  <TableHead className="hidden sm:table-cell text-[10px] h-8 font-medium text-muted-foreground/70">Slug</TableHead>
                  <TableHead className="hidden md:table-cell text-[10px] h-8 font-medium text-muted-foreground/70">Skloněný tvar</TableHead>
                  <TableHead className="hidden lg:table-cell text-[10px] h-8 font-medium text-muted-foreground/70">Vyhledávací termíny</TableHead>
                  <TableHead className="text-[10px] h-8 font-medium text-muted-foreground/70 text-center">Podkat.</TableHead>
                  <TableHead className="text-[10px] h-8 font-medium text-muted-foreground/70 text-center">Nabídka</TableHead>
                  <TableHead className="text-[10px] h-8 font-medium text-muted-foreground/70 text-center">Poptávka</TableHead>
                  <TableHead className="text-[10px] h-8 font-medium text-muted-foreground/70 text-right pr-6">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Žádné kategorie nenalezeny
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.flatMap((cat) => [
                    <TableRow key={cat.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleExpand(cat.id)}>
                      <TableCell className="py-2">
                        <Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:bg-transparent">
                          {expandedCats.includes(cat.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </Button>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm">
                            {renderIcon(cat.slug)}
                          </div>
                          <span className="font-semibold text-[11px] text-foreground">{cat.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-[10px] font-mono py-2">
                        {cat.slug}
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-2">-</TableCell>
                      <TableCell className="hidden lg:table-cell py-2">-</TableCell>
                      <TableCell className="text-center text-[10px] font-medium py-2">{cat.subcategory_count}</TableCell>
                      <TableCell className="text-center text-[10px] font-medium py-2">{cat.supply}</TableCell>
                      <TableCell className="text-center text-[10px] font-medium py-2">{cat.demand}</TableCell>
                      <TableCell className="text-right py-2">
                        <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Exportovat CSV s podkategoriemi"
                            onClick={() => exportCategoryCSV(cat)}
                          >
                            <FileDown className="h-3.5 w-3.5 text-blue-500" />
                          </Button>
                          <div className="relative">
                            <input
                              type="file"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              accept=".csv"
                              title="Importovat CSV (Název,Slug)"
                              onChange={(e) => handleImportCSV(cat, e)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 pointer-events-none"
                            >
                              <FileUp className="h-3.5 w-3.5 text-green-500" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Přidat podkategorii"
                            onClick={() => openAddSub(cat.id)}
                          >
                            <Plus className="h-3.5 w-3.5 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(cat)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>,
                    expandedCats.includes(cat.id) && (
                      cat.subcategories.length > 0 ? (
                        cat.subcategories.map(sub => (
                          <TableRow key={sub.id} className="bg-muted/20 border-l-2 border-l-primary/30 group">
                            <TableCell className="py-1.5"></TableCell>
                            <TableCell className="pl-8 py-1.5">
                              <span className="text-[10px] font-medium">{sub.name}</span>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-muted-foreground text-[10px] font-mono py-1.5">
                              {sub.slug}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground text-[10px] py-1.5">
                              {sub.category_form || <span className="text-[9px] italic opacity-40">nedefinováno</span>}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell py-1.5 max-w-[200px]">
                              <div className="flex flex-wrap gap-1">
                                {sub.search_terms && sub.search_terms.length > 0 ? (
                                  sub.search_terms.slice(0, 3).map((term, i) => (
                                    <span key={i} className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1 rounded border border-border/50 truncate">
                                      {term}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[9px] text-muted-foreground italic">žádné termíny</span>
                                )}
                                {sub.search_terms && sub.search_terms.length > 3 && (
                                  <span className="text-[9px] text-muted-foreground">+{sub.search_terms.length - 3}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-1.5">-</TableCell>
                            <TableCell className="text-center text-[10px] py-1.5">{sub.supply}</TableCell>
                            <TableCell className="text-center text-[10px] py-1.5">{sub.demand}</TableCell>
                            <TableCell className="text-right py-1.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditSub(sub, cat.id);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow key={`${cat.id}-empty`} className="bg-muted/10 border-l-2 border-l-primary/10">
                          <TableCell className="py-2"></TableCell>
                          <TableCell colSpan={7} className="pl-8 py-2 text-[10px] text-muted-foreground italic">
                            Žádné podkategorie
                          </TableCell>
                        </TableRow>
                      )
                    )
                  ])
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upravit kategorii</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-medium">Název</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-[10px]" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-medium">Slug</Label>
              <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} className="h-8 font-mono text-[10px]" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-medium">Popis</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                placeholder="Volitelný popis kategorie..."
                className="text-[10px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-medium">Ikona (slug)</Label>
              <div className="flex items-center gap-2">
                <Input value={editIcon} onChange={(e) => setEditIcon(e.target.value)} className="h-8 font-mono text-[10px]" />
                {editIcon && renderIcon(editIcon)}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-medium">Obrázek / Cover</Label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-[10px] hover:bg-accent transition-colors">
                  <Upload className="h-4 w-4" />
                  Nahrát
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" className="h-10 w-10 rounded object-cover" />
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleSave} disabled={saving || !editName || !editSlug}>
              {saving ? (uploading ? "Nahrávám..." : "Ukládám...") : "Uložit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subcategory Edit Dialog */}
      <Dialog open={subEditOpen} onOpenChange={setSubEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editSub ? "Upravit podkategorii" : "Přidat podkategorii"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-medium">Název</Label>
              <Input value={editSubName} onChange={(e) => setEditSubName(e.target.value)} className="h-8 text-[10px]" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-medium">Slug</Label>
              <Input value={editSubSlug} onChange={(e) => setEditSubSlug(e.target.value)} className="h-8 font-mono text-[10px]" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-medium">Skloněný tvar (category_form)</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleGenerateSingleForm} 
                  disabled={generatingAi || !editSubName}
                  className="h-6 text-[10px] font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 gap-1 px-2 cursor-pointer"
                >
                  {generatingAi ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  <span>✨ AI skloňování</span>
                </Button>
              </div>
              <Input 
                value={editSubForm} 
                onChange={(e) => setEditSubForm(e.target.value)} 
                placeholder="Např. instalatéra" 
                className="h-8 text-[10px]"
              />
              <p className="text-[10px] text-muted-foreground italic">
                Používá se v e-mailech: "našel jsem Vás při hledání [skloněný tvar] v [lokalita]"
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-medium">Vyhledávací termíny (Vyhledavací_kategorie)</Label>
              <Textarea 
                value={editSubSearchTerms} 
                onChange={(e) => setEditSubSearchTerms(e.target.value)} 
                placeholder="Např. Instalatér, Oprava kohoutku, Výměna roháčků" 
                rows={3}
                className="text-[10px]"
              />
              <p className="text-[10px] text-muted-foreground italic">
                Čárkou oddělené termíny, které při importu kontaktů automaticky přiřadí tuto podkategorii.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubEditOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleSaveSub} disabled={subSaving || !editSubName || !editSubSlug}>
              {subSaving ? "Ukládám..." : "Uložit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
