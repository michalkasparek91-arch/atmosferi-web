import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface AdminPageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  className?: string;
}

export function AdminPageHeader({ icon: Icon, title, subtitle, actions, className }: AdminPageHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${className || "mb-8"}`}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full border border-border/60 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-foreground transition-all group-hover:scale-110">
          <Icon className="h-4 w-4 opacity-70" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight leading-none">{title}</h1>
          <p className="text-muted-foreground text-[10px] font-medium mt-1 opacity-60 leading-none">{subtitle}</p>
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

