import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  LayoutDashboard, BarChart3, Users, Briefcase, CheckCircle,
  Star, Ticket, Bell, Mail, AlertTriangle, ScrollText, FolderTree, Settings,
} from "lucide-react";

const adminPages = [
  { label: "Přehled", href: "/admin/prehled", icon: LayoutDashboard, keywords: "dashboard home" },
  { label: "Analytika", href: "/admin/analytika", icon: BarChart3, keywords: "analytics stats" },
  { label: "Uživatelé", href: "/admin/uzivatele", icon: Users, keywords: "users people" },
  { label: "Zakázky", href: "/admin/zakazky", icon: Briefcase, keywords: "jobs orders" },
  { label: "Verifikace", href: "/admin/verifikace", icon: CheckCircle, keywords: "verification identity" },
  { label: "Recenze", href: "/admin/recenze", icon: Star, keywords: "reviews ratings" },
  { label: "Kupóny", href: "/admin/kupony", icon: Ticket, keywords: "coupons promo codes" },
  { label: "Notifikace", href: "/admin/notifikace", icon: Bell, keywords: "notifications push" },
  { label: "E-maily", href: "/admin/emaily", icon: Mail, keywords: "emails campaigns" },
  { label: "Hlášení", href: "/admin/hlaseni", icon: AlertTriangle, keywords: "reports complaints" },
  { label: "Audit Log", href: "/admin/log", icon: ScrollText, keywords: "audit history log" },
  { label: "Kategorie", href: "/admin/kategorie", icon: FolderTree, keywords: "categories services" },
  { label: "Nastavení", href: "/admin/nastaveni", icon: Settings, keywords: "settings config" },
];

export function AdminCommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Hledat stránku..." />
      <CommandList>
        <CommandEmpty>Nic nenalezeno.</CommandEmpty>
        <CommandGroup heading="Stránky">
          {adminPages.map((page) => (
            <CommandItem
              key={page.href}
              value={`${page.label} ${page.keywords}`}
              onSelect={() => {
                navigate(page.href);
                setOpen(false);
              }}
              className="cursor-pointer"
            >
              <page.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{page.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
