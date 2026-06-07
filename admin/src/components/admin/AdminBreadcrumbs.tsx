import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const routeLabels: Record<string, string> = {
  "prehled": "Přehled",
  "analytika": "Analytika",
  "uzivatele": "Uživatelé",
  "zakazky": "Zakázky",
  "verifikace": "Verifikace",
  "recenze": "Recenze",
  "kupony": "Kupóny",
  "notifikace": "Notifikace",
  "emaily": "E-maily",
  "hlaseni": "Hlášení",
  "log": "Audit Log",
  "kategorie": "Kategorie",
  "nastaveni": "Nastavení",
};

export function AdminBreadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);
  
  // Only show if we're in admin with at least one sub-route
  if (segments.length < 2 || segments[0] !== "admin") return null;

  const currentSegment = segments[segments.length - 1];
  const label = routeLabels[currentSegment] || currentSegment;

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList className="gap-1.5">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/admin/prehled" className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground/60 hover:text-foreground transition-colors">
              Herodes
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="opacity-30 scale-75" />
        <BreadcrumbItem>
          <BreadcrumbPage className="text-[11px] uppercase tracking-wider font-bold text-foreground/80">{label}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
