import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Save, Eye, EyeOff, Image as ImageIcon, 
  ChevronDown, Globe, FileText, Layout, Info, Loader2, Bold, Italic, Heading2, Heading3, List, Link as LinkIcon, CheckCircle, Zap, Upload, X, ClipboardPaste, Wand2, Copy, Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { pingIndexNow } from "@/lib/seo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORIES = ['Návody', 'Ceníky', 'Katastrofy', 'Inspirace'];

const ARTICLE_AI_PROMPT = `Vygeneruj článek pro magazín Zrobee.cz v češtině.
Styl: vtipný Anti-DIY, bolestivě relatable, praktický, bez přehnaného sales tónu.
Vrať výhradně validní JSON objekt:
{
  "title": "SEO titulek (35-65 znaků)",
  "slug": "ascii-kebab-case",
  "category": "Návody|Ceníky|Katastrofy|Inspirace",
  "excerpt": "120–160 znaků pro meta description",
  "image_prompt": "Detailní prompt pro generátor obrázků (DALL-E/Midjourney)",
  "internal_links": ["/sluzby/...", "/nova-poptavka", "/cenik/..."],
  "content": "Markdown obsah s ## nadpisy, odrážkami a jedním <!-- RESCUE_BANNER -->. Minimálně 900 slov."
}`;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const stripCodeFence = (value: string) =>
  value.trim().replace(/^```(?:json|markdown|md)?\s*/i, "").replace(/```$/i, "").trim();

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const renderInlineMarkdown = (value: string) =>
  escapeHtml(value)
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g, '<img src="$2" alt="$1" class="rounded-2xl shadow-lg my-8" />')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g, '<a href="$2" class="text-primary font-bold underline underline-offset-4">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>');

const markdownToHtml = (text: string) => {
  const blocks = (text || "").split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return blocks.map((block) => {
    if (block === '<!-- RESCUE_BANNER -->') {
      return '<div class="bg-primary/10 p-8 rounded-[2rem] my-8 text-center text-primary font-black uppercase tracking-widest text-xs border-2 border-dashed border-primary/20">Zde se zobrazí Witty Rescue Banner</div>';
    }
    if (block.startsWith('### ')) return `<h3>${renderInlineMarkdown(block.slice(4))}</h3>`;
    if (block.startsWith('## ')) return `<h2>${renderInlineMarkdown(block.slice(3))}</h2>`;

    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.length > 0 && lines.every((line) => line.startsWith('- '))) {
      return `<ul>${lines.map((line) => `<li>${renderInlineMarkdown(line.slice(2))}</li>`).join('')}</ul>`;
    }
    if (lines.length > 0 && lines.every((line) => /^\d+\.\s+/.test(line))) {
      return `<ol>${lines.map((line) => `<li>${renderInlineMarkdown(line.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`;
    }
    return `<p>${renderInlineMarkdown(block).replace(/\n/g, '<br />')}</p>`;
  }).join('');
};

export default function AdminArticleEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [aiPaste, setAiPaste] = useState("");
  const [aiTopic, setAiTopic] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    category: "Návody",
    excerpt: "",
    content: "",
    image_url: "",
    status: "draft" as 'draft' | 'published'
  });

  const wordCount = (formData.content || "").trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.ceil(wordCount / 200);
  const hasBanner = (formData.content || "").includes('<!-- RESCUE_BANNER -->');
  const internalLinksCount = (formData.content?.match(/\]\(\/(?:sluzby|mesta|cenik|nova-poptavka)/g) || []).length;
  const isSlugValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.slug || "");
  
  const seoChecklist = [
    { label: 'Titulek (35–65 znaků)', met: (formData.title || "").length >= 35 && (formData.title || "").length <= 65, tip: "Titulek je buď příliš krátký nebo příliš dlouhý pro Google." },
    { label: 'Perex (120–160 znaků)', met: (formData.excerpt || "").length >= 120 && (formData.excerpt || "").length <= 160, tip: "Meta description by měl mít ideální délku pro zobrazení ve vyhledávání." },
    { label: 'Validní URL adresa (slug)', met: isSlugValid, tip: "Slug nesmí obsahovat diakritiku ani speciální znaky kromě pomlček." },
    { label: 'Délka textu (min 1000 slov)', met: wordCount >= 1000, tip: "Dlouhé, expertní články se umisťují lépe na první pozice." },
    { label: 'Interní odkazy (min 3)', met: internalLinksCount >= 3, tip: "Odkazujte na ceníky, služby nebo poptávkový formulář." },
    { label: 'Rescue Banner (CTA)', met: hasBanner, tip: "Nezapomeňte vložit <!-- RESCUE_BANNER --> do dramatické části textu." },
    { label: 'Hlavní obrázek', met: !!formData.image_url, tip: "Článek bez obrázku nikdo nebude sdílet." }
  ];
  const seoScore = seoChecklist.filter(item => item.met).length;


  useEffect(() => {
    if (id) {
      fetchArticle();
    }
  }, [id]);

  const fetchArticle = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (data) {
        setFormData({
          title: data.title || "",
          slug: data.slug || "",
          category: data.category || "Návody",
          excerpt: data.excerpt || "",
          content: data.content || "",
          image_url: data.image_url || "",
          status: data.status === "published" ? "published" : "draft",
        });
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      toast.error('Nepodařilo se načíst článek');
      navigate('/admin/magazin');
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = (val: string) => {
    const slug = val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    
    setFormData(prev => ({ ...prev, title: val, slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (id) {
        const { error } = await supabase
          .from('articles')
          .update(formData)
          .eq('id', id);
        if (error) throw error;
        toast.success('Článek byl aktualizován');
      } else {
        const { error } = await supabase
          .from('articles')
          .insert([formData]);
        if (error) throw error;
        toast.success('Článek byl vytvořen');
        if (formData.status === 'published') {
          pingIndexNow(`/radce/${formData.slug}`);
          toast.info('Odesláno k indexaci');
        }
        navigate('/admin/magazin');
      }
      
      if (id && formData.status === 'published') {
        pingIndexNow(`/radce/${formData.slug}`);
      }
    } catch (error) {
      console.error('Error saving article:', error);
      toast.error('Chyba při ukládání');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `articles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('article-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('article-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast.success('Obrázek byl nahrán');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Chyba při nahrávání obrázku. Ujistěte se, že bucket "article-images" existuje.');
    } finally {
      setUploading(false);
    }
  };


  const importAiDraft = () => {
    const raw = stripCodeFence(aiPaste);
    if (!raw) {
      toast.error('Vložte nejdřív výstup z AI');
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const article = Array.isArray(parsed) ? parsed[0] : parsed;
      if (article && typeof article === 'object') {
        const title = String(article.title || formData.title || '');
        setFormData(prev => ({
          ...prev,
          title,
          slug: String(article.slug || prev.slug || slugify(title)),
          category: CATEGORIES.includes(String(article.category)) ? String(article.category) : prev.category,
          excerpt: String(article.excerpt || prev.excerpt || ''),
          content: String(article.content || prev.content || '').replace(/```/g, '').trim(),
          image_url: String(article.image_url || prev.image_url || ''),
        }));
        
        if (article.image_prompt) {
          setImagePrompt(String(article.image_prompt));
        }
        
        toast.success('AI článek byl rozpoznán a vyplněn');
        return;
      }
    } catch {
      // Fall back to labelled text / raw Markdown parsing below.
    }

    const getField = (label: string) => {
      const match = raw.match(new RegExp(`${label}\\s*:\\s*([\\s\\S]*?)(?=\\n(?:title|titulek|slug|category|kategorie|excerpt|perex|content|obsah)\\s*:|$)`, 'i'));
      return match?.[1]?.trim() || '';
    };

    const title = getField('(?:title|titulek)') || raw.match(/^#\s+(.+)$/m)?.[1]?.trim() || raw.match(/^##\s+(.+)$/m)?.[1]?.trim() || formData.title;
    const excerpt = getField('(?:excerpt|perex)');
    const category = getField('(?:category|kategorie)');
    const explicitContent = getField('(?:content|obsah)');
    const content = stripCodeFence(explicitContent || raw).replace(/^#\s+.+\n+/, '').trim();

    setFormData(prev => ({
      ...prev,
      title,
      slug: getField('slug') || prev.slug || slugify(title),
      category: CATEGORIES.includes(category) ? category : prev.category,
      excerpt: excerpt || prev.excerpt,
      content,
    }));
    toast.success('Text byl vložen jako návrh článku');
  };

  const copyAiPrompt = async () => {
    await navigator.clipboard.writeText(ARTICLE_AI_PROMPT);
    toast.success('Prompt pro AI zkopírován');
  };

  const generateWithAI = async (forceClever = false) => {
    const topic = aiTopic.trim();
    if (!forceClever && topic.length < 5) {
      toast.error('Zadejte téma článku (alespoň 5 znaků)');
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-article', {
        body: { topic, category: formData.category },
      });
      if (error) throw error;
      const article = data?.article;
      if (!article || typeof article !== 'object') throw new Error('Neplatná odpověď AI');

      const title = String(article.title || '');
      setFormData(prev => ({
        ...prev,
        title,
        slug: String(article.slug || slugify(title)),
        category: CATEGORIES.includes(String(article.category)) ? String(article.category) : prev.category,
        excerpt: String(article.excerpt || ''),
        content: String(article.content || '').replace(/```/g, '').trim(),
        image_url: String(article.image_url || prev.image_url || ''),
      }));
      if (article.image_prompt) setImagePrompt(String(article.image_prompt));
      toast.success(forceClever ? 'AI vymyslela a vygenerovala článek' : 'Článek vygenerován pomocí AI');
      setAiTopic('');
    } catch (e: any) {
      console.error('AI generate error:', e);
      const msg = e?.message?.includes('429') ? 'Příliš mnoho požadavků — zkuste za chvíli'
        : e?.message?.includes('402') ? 'AI kredit vyčerpán — doplňte v Settings → Workspace'
        : 'Nepodařilo se vygenerovat článek';
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };


  const refineWithAI = async () => {
    if (!formData.content || formData.content.length < 100) {
      toast.error('Článek je příliš krátký na vylepšení');
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-article', {
        body: { 
          refine: true, 
          existingContent: `Title: ${formData.title}\nCategory: ${formData.category}\nExcerpt: ${formData.excerpt}\n\nContent:\n${formData.content}` 
        },
      });
      if (error) throw error;
      const article = data?.article;
      if (!article || typeof article !== 'object') throw new Error('Neplatná odpověď AI');

      setFormData(prev => ({
        ...prev,
        title: String(article.title || prev.title),
        slug: String(article.slug || prev.slug),
        excerpt: String(article.excerpt || prev.excerpt),
        content: String(article.content || prev.content).replace(/```/g, '').trim(),
      }));
      toast.success('Článek byl vylepšen pomocí AI');
    } catch (e: any) {
      console.error('AI refine error:', e);
      toast.error('Nepodařilo se vylepšit článek');
    } finally {
      setGenerating(false);
    }
  };


  const insertTag = (tagStart: string, tagEnd: string = '') => {
    const textarea = document.getElementById('article-content') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);

    const newContent = before + tagStart + selected + tagEnd + after;
    setFormData(prev => ({ ...prev, content: newContent }));
    
    // Focus back and set selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagStart.length, end + tagStart.length);
    }, 10);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <AdminPageHeader
        icon={FileText}
        title={id ? "Upravit článek" : "Nový článek"}
        subtitle={formData.title || "Sekce pro budování autority"}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/magazin')} disabled={saving} className="rounded-full">
              <ArrowLeft className="h-4 w-4 mr-2" /> Zrušit
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="gap-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {formData.status === 'published' ? 'Publikovat článek' : 'Uložit koncept'}
            </Button>
          </div>
        }
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Editor Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm bg-gradient-to-br from-primary/10 to-card rounded-3xl">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-primary" />
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Vygenerovat článek přes Lovable AI</Label>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Zadejte téma — AI vygeneruje kompletní článek (titulek, slug, perex, obsah, image prompt) ve stylu Zrobee a vyplní ho do editoru.
              </p>
              <div className="flex flex-col md:flex-row gap-3">
                <Input
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Zadejte téma... nebo nechte AI vymyslet něco úžasného"
                  className="bg-background/80 border-border/50 rounded-2xl flex-grow h-12"
                  disabled={generating}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => generateWithAI(false)}
                    disabled={generating || aiTopic.length < 5}
                    className="rounded-full gap-2 flex-1 md:flex-none shadow-sm"
                  >
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    Generovat
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => generateWithAI(true)}
                    disabled={generating}
                    className="rounded-full gap-2 border-primary/20 hover:bg-primary/5 text-primary flex-1 md:flex-none"
                  >
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Vymysli mi téma
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-card rounded-3xl">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Wand2 className="h-4 w-4 text-primary" />
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Nebo vložte AI výstup ručně</Label>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Vložte JSON nebo Markdown z externí AI. Editor automaticky vyplní titulek, slug, kategorii, perex a obsah.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={copyAiPrompt} className="rounded-full gap-2 shrink-0">
                  <Copy className="h-3.5 w-3.5" /> Prompt
                </Button>
              </div>
              <Textarea
                value={aiPaste}
                onChange={(e) => setAiPaste(e.target.value)}
                placeholder='Sem vložte AI výstup – ideálně JSON s poli title, slug, category, excerpt, content.'
                className="min-h-[140px] bg-muted/30 border-none rounded-2xl p-4 text-xs font-mono resize-y"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={importAiDraft} className="rounded-full gap-2">
                  <ClipboardPaste className="h-4 w-4" /> Vyplnit článek z AI
                </Button>
                {imagePrompt && (
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => {
                      navigator.clipboard.writeText(imagePrompt);
                      toast.success('Prompt pro obrázek zkopírován');
                    }} 
                    className="rounded-full gap-2"
                  >
                    <ImageIcon className="h-4 w-4" /> Kopírovat Image Prompt
                  </Button>
                )}
                <Button type="button" variant="ghost" onClick={() => setAiPaste(ARTICLE_AI_PROMPT)} className="rounded-full text-xs">
                  Ukázat doporučený prompt
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-card">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Titulek článku</Label>
                <Input 
                  value={formData.title || ""} 
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Jak (ne)vymalovat obývák svépomocí"
                  className="h-14 text-2xl font-black bg-background border-border/50 focus:border-primary rounded-2xl px-6"
                />
              </div>

              <div className="flex items-center gap-2 text-xs font-mono bg-muted/30 px-4 py-3 rounded-xl border border-dashed border-border">
                <span className="text-muted-foreground">slug: /radce/</span>
                <input 
                  className="bg-transparent border-none outline-none text-foreground font-bold flex-1" 
                  value={formData.slug || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl overflow-hidden rounded-[2.5rem]">
            <div className="bg-muted/50 px-6 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => insertTag('**', '**')} className="h-9 w-9 rounded-lg" title="Tučné"><Bold className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => insertTag('_', '_')} className="h-9 w-9 rounded-lg" title="Kurzíva"><Italic className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => insertTag('\n## ', '')} className="h-9 w-9 rounded-lg" title="Nadpis H2"><Heading2 className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => insertTag('\n### ', '')} className="h-9 w-9 rounded-lg" title="Nadpis H3"><Heading3 className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => insertTag('\n- ', '')} className="h-9 w-9 rounded-lg" title="Seznam"><List className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => insertTag('[', '](url)')} className="h-9 w-9 rounded-lg" title="Odkaz"><LinkIcon className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => insertTag('![Popis]', '(url)')} className="h-9 w-9 rounded-lg" title="Obrázek"><ImageIcon className="h-4 w-4" /></Button>
                <div className="w-px h-4 bg-border mx-2" />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => insertTag('\n<!-- RESCUE_BANNER -->\n')} 
                  className={cn(
                    "h-8 rounded-full text-xs font-bold px-3 gap-1.5",
                    hasBanner ? "bg-primary/10 text-primary border-primary/20" : "text-orange-600 border-orange-200 bg-orange-50"
                  )}
                >
                  <Zap className="h-3 w-3" /> {hasBanner ? 'Banner vložen' : 'Vložit Banner'}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={refineWithAI}
                  disabled={generating || !formData.content}
                  className="h-8 rounded-full text-xs font-bold px-3 gap-1.5 border-primary/20 text-primary hover:bg-primary/5"
                >
                  {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Vylepšit styl AI
                </Button>
                <Button 
                  type="button" 
                  variant={isPreviewMode ? "secondary" : "ghost"} 
                  size="sm" 
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className="h-9 gap-2 text-[10px] uppercase font-bold rounded-full px-4"
                >
                  {isPreviewMode ? <><EyeOff className="h-4 w-4 text-primary" /> Editor</> : <><Eye className="h-4 w-4" /> Náhled webu</>}
                </Button>
              </div>

            </div>
            <CardContent className="p-0 min-h-[600px] flex flex-col">
              {isPreviewMode ? (
                <div className={cn(
                  "p-12 prose prose-slate dark:prose-invert max-w-none flex-grow",
                  "prose-h2:text-3xl prose-h2:font-black prose-h2:uppercase prose-h2:tracking-tight",
                  "prose-p:leading-relaxed prose-p:text-muted-foreground/90 font-sans"
                )}>
                  <div dangerouslySetInnerHTML={{ __html: markdownToHtml(formData.content || "") }} />
                </div>
              ) : (
                <Textarea
                  id="article-content"
                  value={formData.content || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Tady začíná váš (ne)příběh. Používejte markdown pro nadpisy (##) a seznamy (-)."
                  className="flex-grow min-h-[600px] border-none shadow-none resize-none p-12 font-mono text-base leading-relaxed focus-visible:ring-0 bg-background"
                />
              )}
              
              {/* Content Metrics Footer */}
              <div className="bg-muted/20 border-t px-6 py-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <div className="flex gap-6">
                  <span>Slov: {wordCount}</span>
                  <span>Doba čtení: ~{readingTime} min</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    wordCount < 100 ? "bg-red-500" : wordCount < 300 ? "bg-orange-500" : "bg-emerald-500"
                  )} />
                  {wordCount < 100 ? 'Velmi krátké' : wordCount < 300 ? 'Optimální pro Quick tip' : 'Skvělá délka pro SEO'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Settings Section */}
        <div className="space-y-6">
          {/* SEO Health Card */}
          <Card className="border-none shadow-sm bg-foreground text-background rounded-3xl overflow-hidden">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">SEO Kontrola</span>
                <span className="text-xl font-black text-primary">{seoScore}/{seoChecklist.length}</span>
              </div>
              <div className="space-y-3">
                {seoChecklist.map((item, i) => (
                  <div key={i} className="group relative">
                    <div className="flex items-center justify-between text-[10px] font-bold py-1">
                      <span className={cn(item.met ? "text-background" : "text-background/40")}>{item.label}</span>
                      <div className={cn(
                        "h-5 w-5 rounded-full flex items-center justify-center transition-all", 
                        item.met ? "bg-primary text-primary-foreground" : "bg-orange-500/20 text-orange-500 border border-orange-500/30"
                      )}>
                        {item.met ? <CheckCircle className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
                      </div>
                    </div>
                    {!item.met && (
                      <div className="hidden group-hover:block absolute left-0 -top-10 z-10 bg-background text-foreground text-[9px] p-2 rounded-lg shadow-xl border border-border w-full">
                        {item.tip}
                      </div>
                    )}
                  </div>
                ))}

              </div>
              
              {seoScore < seoChecklist.length && (
                <div className="pt-2">
                  <p className="text-[9px] text-background/50 leading-relaxed italic">
                    Tip: Google miluje delší texty s interními odkazy a jasným CTA.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl">
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Viditelnost</Label>
                  <Badge variant={formData.status === 'published' ? 'default' : 'secondary'} className="rounded-full">
                    {formData.status === 'published' ? 'Publikováno' : 'Koncept'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="bg-background p-2 rounded-lg shadow-sm">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-xs font-bold">Zveřejnit článek</span>
                  </div>
                  <Switch 
                    checked={formData.status === 'published'}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, status: checked ? 'published' : 'draft' }))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Kategorie obsahu</Label>
                <Select 
                  value={formData.category || "Návody"} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                >
                  <SelectTrigger className="h-12 bg-muted/30 border-none rounded-xl px-4 font-bold text-sm">
                    <SelectValue placeholder="Vyberte kategorii" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">SEO Perex (Excerpt)</Label>
                <Textarea 
                  value={formData.excerpt || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Krátké lákadlo pro čtenáře, které se zobrazí na kartě a ve výsledcích vyhledávání."
                  className="h-32 bg-muted/30 border-none rounded-2xl p-4 text-xs resize-none leading-relaxed"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hlavní obrázek (Cover)</Label>
                <div 
                  className={cn(
                    "relative border-2 border-dashed rounded-[2.5rem] p-6 transition-all group overflow-hidden bg-muted/20",
                    formData.image_url ? "border-primary/20" : "border-border hover:border-primary/40",
                    uploading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {formData.image_url ? (
                    <div className="relative aspect-video rounded-2xl overflow-hidden group">
                      <img src={formData.image_url} alt="Cover" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Label htmlFor="cover-upload" className="cursor-pointer bg-white text-black text-xs font-bold px-4 py-2 rounded-full hover:bg-slate-100 transition-colors">
                          Změnit
                        </Label>
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="icon" 
                          className="rounded-full h-8 w-8"
                          onClick={() => setFormData(prev => ({ ...prev, image_url: "" }))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Label htmlFor="cover-upload" className="flex flex-col items-center justify-center gap-3 py-10 cursor-pointer">
                      <div className="w-12 h-12 rounded-full bg-background border border-border shadow-sm flex items-center justify-center text-muted-foreground group-hover:scale-110 group-hover:text-primary transition-all">
                        {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold">Nahrát hlavní obrázek</p>
                        <p className="text-[10px] text-muted-foreground mt-1 uppercase font-black tracking-widest">PNG, JPG, WEBP (Max 5MB)</p>
                      </div>
                    </Label>
                  )}
                  <Input 
                    id="cover-upload"
                    type="file" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
