import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface AdminPageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  className?: string;
}

export function AdminPageHeader({ title, subtitle, actions, className }: AdminPageHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${className || "mb-8"}`}>
      <div>
        <h1 className="text-[34px] leading-[1.05] font-medium tracking-[-0.035em] text-foreground">{title}</h1>
        {subtitle && <p className="text-muted-foreground text-sm mt-2">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

