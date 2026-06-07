import { Skeleton } from "@/components/ui/skeleton";

const ContentLoader = () => {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4">
      {/* Page title skeleton */}
      <Skeleton className="h-6 w-48 mb-6" />
      
      {/* Content cards skeleton */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card rounded-lg p-4 space-y-3 border">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-16 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContentLoader;
