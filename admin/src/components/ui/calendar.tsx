import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        caption: "flex justify-between items-center px-1",
        caption_label: "text-base font-medium text-foreground",
        nav: "flex items-center gap-1",
        nav_button: cn(
          "h-8 w-8 bg-transparent p-0 text-muted-foreground hover:text-foreground transition-colors inline-flex items-center justify-center rounded-lg hover:bg-muted/50",
        ),
        nav_button_previous: "",
        nav_button_next: "",
        table: "w-full border-collapse mt-4",
        head_row: "flex w-full",
        head_cell: "text-muted-foreground flex-1 font-medium text-[11px] uppercase tracking-wide",
        row: "flex w-full mt-1",
        cell: cn(
          "flex-1 text-center text-sm p-0.5 relative",
          "[&:has([aria-selected])]:bg-transparent",
          "[&:has(.day-with-dot)]:pb-1"
        ),
        day: cn(
          "h-10 w-full p-0 font-normal rounded-lg transition-colors",
          "hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
          "aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-lg",
        day_today: "text-primary font-semibold",
        day_outside: "day-outside text-muted-foreground/40 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground/30",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-5 w-5" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-5 w-5" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
