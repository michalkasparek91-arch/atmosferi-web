interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
}

const SectionHeading = ({ eyebrow, title, subtitle, align = "left", className = "" }: SectionHeadingProps) => {
  const alignCls = align === "center" ? "text-center mx-auto" : "text-left";
  return (
    <div className={`max-w-2xl ${alignCls} ${className}`}>
      {eyebrow && (
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
          {eyebrow}
        </div>
      )}
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-base md:text-lg text-muted-foreground leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default SectionHeading;
