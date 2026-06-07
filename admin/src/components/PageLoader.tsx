import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const PageLoader = () => {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStuck(true), 12_000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>

        {/* Content skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
          <Skeleton className="h-48 rounded-lg" />
        </div>

        {stuck && (
          <div className="flex flex-col items-center gap-3 pt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Načítání trvá déle než obvykle…
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition active:scale-95"
            >
              Obnovit
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageLoader;
