import { Shield, CheckCircle, Tag } from "lucide-react";

const TrustBadgeStripe = () => {
  const badges = [
    { icon: Shield, text: "Bez skrytých poplatků" },
    { icon: CheckCircle, text: "Ověření profesionálové" },
    { icon: Tag, text: "Poptávka zdarma" },
  ];

  return (
    <div className="w-full bg-secondary dark:bg-secondary py-3 md:py-4 px-3 md:px-4 relative z-10">
      <div className="mx-auto max-w-4xl flex items-center justify-center gap-3 sm:gap-6 md:gap-16">
        {badges.map((badge, index) => (
          <div key={index} className="flex items-center gap-1 sm:gap-2">
            <badge.icon className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span className="text-[10px] sm:text-sm text-foreground dark:text-sidebar-foreground whitespace-nowrap">
              {badge.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrustBadgeStripe;
