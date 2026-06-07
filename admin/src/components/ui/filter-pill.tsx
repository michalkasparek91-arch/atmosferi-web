import * as React from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * FilterPill — canonical list/filter/sort pill used across worker & customer
 * dashboards. Matches the "Vše" pill on the Worker › Probíhající page.
 *
 *  Inactive: white card chip, muted icon, dark text.
 *  Active:   fresh-green fill (--primary) with dark foreground text.
 *
 *  Variants:
 *    <FilterPill icon={LayoutGrid} active hasMenu open={open}>Vše</FilterPill>
 *    <FilterPill icon={CheckCircle} muted>Dokončené (12)</FilterPill>
 *    <FilterPillChip active>Malování</FilterPillChip>
 */

export interface FilterPillProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  /** Selected / applied state — uses primary fill */
  active?: boolean;
  /** Render a trailing chevron (for dropdown triggers) */
  hasMenu?: boolean;
  /** When hasMenu, rotates the chevron 180° */
  open?: boolean;
  /** Tertiary link-style pill (kept understated, no active state) */
  muted?: boolean;
}

const baseClasses =
  "inline-flex items-center gap-2 h-9 rounded-full border text-xs font-semibold whitespace-nowrap shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

export const FilterPill = React.forwardRef<HTMLButtonElement, FilterPillProps>(
  (
    {
      icon: Icon,
      active = false,
      hasMenu = false,
      open = false,
      muted = false,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const padding = hasMenu ? "pl-4 pr-3" : "px-4";

    const stateClasses = active
      ? "bg-primary border-primary text-foreground hover:bg-primary/90"
      : muted
        ? "bg-card border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50"
        : "bg-card border-border/50 text-foreground hover:bg-muted/50";

    const iconColor = active
      ? "text-foreground"
      : muted
        ? "text-muted-foreground"
        : "text-muted-foreground";

    return (
      <button
        ref={ref}
        type="button"
        className={cn(baseClasses, padding, stateClasses, className)}
        {...props}
      >
        {Icon && (
          <Icon className={cn("h-3.5 w-3.5 shrink-0", iconColor)} strokeWidth={1.75} />
        )}
        <span className="truncate">{children}</span>
        {hasMenu && (
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-transform",
              active ? "text-foreground" : "text-muted-foreground",
              open && "rotate-180",
            )}
            strokeWidth={1.75}
          />
        )}
      </button>
    );
  },
);
FilterPill.displayName = "FilterPill";

/**
 * Chip variant — same look, intended for horizontal scrollable filter rows.
 * Identical styling to FilterPill but without the chevron affordance.
 */
export interface FilterPillChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  active?: boolean;
}

export const FilterPillChip = React.forwardRef<
  HTMLButtonElement,
  FilterPillChipProps
>(({ icon: Icon, active = false, className, children, ...props }, ref) => {
  const stateClasses = active
    ? "bg-primary border-primary text-foreground hover:bg-primary/90"
    : "bg-card border-border/50 text-foreground hover:bg-muted/50";

  return (
    <button
      ref={ref}
      type="button"
      className={cn(baseClasses, "px-4 flex-shrink-0", stateClasses, className)}
      {...props}
    >
      {Icon && (
        <Icon
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            active ? "text-foreground" : "text-muted-foreground",
          )}
          strokeWidth={1.75}
        />
      )}
      <span className="truncate">{children}</span>
    </button>
  );
});
FilterPillChip.displayName = "FilterPillChip";
