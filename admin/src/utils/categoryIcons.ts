import {
  Wrench,
  Sparkles,
  BookOpen,
  Heart,
  Ruler,
  Scissors,
  Truck,
  Zap,
  Car,
  Flower,
  Monitor,
  Building2,
  PawPrint,
  DollarSign,
  Scale,
  Briefcase,
  PartyPopper,
  Paintbrush,
  Armchair,
  Baby,
  House,
  KeyRound,
  Hammer,
  Droplet,
  Home,
  Palette,
  Grid,
  Building,
  Package,
  Trees,
  Shield,
  Construction,
  Trash2,
  Disc,
  Mountain,
  Navigation,
  Code,
  Smartphone,
  Flame,
  Settings,
  ShieldCheck,
  Plane,
  ArrowUpCircle,
  Fence,
  Cpu,
  Network,
  Brain,
  Printer,
  Newspaper,
  PhoneCall,
  Users,
  Watch,
  Gem,
  Apple,
  Layers,
  Wind,
  Palmtree,
  Utensils,
  GlassWater,
  Axe,
  Sun,
  DoorOpen,
  Droplets,
  Activity,
  Crosshair,
  Umbrella,
  Snowflake,
  Music,
  Box,
  Map,
  ArrowUp,
  LayoutGrid,
  Lock,
  FileText,
  DollarSign as DollarIcon,
  Activity as ActivityIcon,
  Truck as TruckIcon,
  Utensils as UtensilsIcon,
  type LucideIcon,
} from "lucide-react";

/**
 * Static icon map for service categories.
 * This avoids `import * as Icons from "lucide-react"` which pulls in the
 * entire 130 KB icon library and blocks LCP.
 */
const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Wrench,
  Sparkles,
  BookOpen,
  Heart,
  Ruler,
  Scissors,
  Truck,
  Zap,
  Car,
  Flower,
  Monitor,
  Building2,
  PawPrint,
  DollarSign,
  Scale,
  Briefcase,
  PartyPopper,
  Paintbrush,
  Armchair,
  Baby,
  House,
  KeyRound,
  Hammer,
  Droplet,
  Home,
  Palette,
  Grid,
  Building,
  Package,
  Trees,
  Shield,
  Construction,
  Trash2,
  Disc,
  Mountain,
  Navigation,
  Code,
  Smartphone,
  Flame,
  Settings,
  ShieldCheck,
  Plane,
  ArrowUpCircle,
  Fence,
  Cpu,
  Network,
  Brain,
  Printer,
  Newspaper,
  PhoneCall,
  Users,
  Watch,
  Gem,
  Apple,
  Layers,
  Wind,
  Palmtree,
  Utensils,
  GlassWater,
  Axe,
  Sun,
  DoorOpen,
  Droplets,
  Activity,
  Crosshair,
  Umbrella,
  Snowflake,
  Music,
  Box,
  Map,
  ArrowUp,
  LayoutGrid,
  Lock,
  DollarIcon,
  ActivityIcon,
  TruckIcon,
  UtensilsIcon,
};

/**
 * Slug-based fallback map – guarantees the right icon even when the DB
 * `icon` column hasn't been fetched yet or is empty.
 */
const SLUG_ICON_MAP: Record<string, LucideIcon> = {
  "instalater": Droplet,
  "hodinovy-manzel": Hammer,
  "uklid": Sparkles,
  "stavby-rekonstrukce": House,
  "elektro": Zap,
  "zahrada": Flower,
  "mazlicci": PawPrint,
  "pc-a-mobile": Monitor,
  "finance": DollarSign,
  "pravni-sluzby": Scale,
  "pro-firmy": Briefcase,
  "ostatni": Paintbrush,
  "auto-moto": Car,
  "doprava": Truck,
  "truharstvo": Scissors,
  "hlidani-a-pece": Baby,
  "zamecnictvi": KeyRound,
  "vyuka-jazyky": BookOpen,
  "zdravi-krasa": Heart,
  "zdravi-sport": ActivityIcon,
  "finance-dane": DollarIcon,
  "gastro-akce": UtensilsIcon,
  "doprava-logistika": TruckIcon,
  "zamecnik": KeyRound,
  "projektovani": Ruler,
  "cestovani": Plane,
  "stavba-domu": Building2,
  "malirske-prace": Paintbrush,
  "auto": Car,
  "design": Palette,
  "domaci-opravy": Home,
  "financni-sluzby": DollarIcon,
  "instalace": Settings,
  "montaz": Hammer,
  "obchodni-sluzby": Briefcase,
  "obklady": Grid,
  "online-sluzby": Monitor,
  "organizace-akci": PartyPopper,
  "pravni-administrativni": FileText,
  "rekonstrukce": Building,
  "stehovani": Package,
  "zahradnictvi": Flower,
};

export const getCategoryIcon = (iconName: string | null | undefined, slug?: string | null | undefined): LucideIcon => {
  if (!iconName && !slug) return Wrench;
  
  // 1. Try slug-based lookup first (often more specific than generic iconName)
  if (slug && SLUG_ICON_MAP[slug]) {
    return SLUG_ICON_MAP[slug];
  }
  
  // 2. Try direct map by icon name (e.g. "Hammer")
  if (iconName && CATEGORY_ICON_MAP[iconName]) {
    return CATEGORY_ICON_MAP[iconName];
  }
  
  // 2. Try case-insensitive normalization (e.g. "hammer" -> "Hammer")
  if (iconName) {
    const normalized = iconName.charAt(0).toUpperCase() + iconName.slice(1).toLowerCase();
    if (CATEGORY_ICON_MAP[normalized]) {
      return CATEGORY_ICON_MAP[normalized];
    }
  }
  
  // 3. Try slug-based lookup if slug provided
  if (slug && SLUG_ICON_MAP[slug]) {
    return SLUG_ICON_MAP[slug];
  }
  
  // 4. Try iconName as a slug (sometimes they are switched in the DB)
  if (iconName && SLUG_ICON_MAP[iconName]) {
    return SLUG_ICON_MAP[iconName];
  }
  
  return Wrench;
};

export const getCategoryIconBySlug = (slug: string): LucideIcon => {
  if (!slug) return Wrench;
  return SLUG_ICON_MAP[slug] || Wrench;
};
