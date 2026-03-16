import { Skeleton } from "@/components/ui/skeleton";

export default function ReservasLoading() {
  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-4">
      {/* Stats bar skeleton */}
      <Skeleton className="h-12 w-full rounded-[14px]" />

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Left panel */}
        <div className="w-[35%] rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <Skeleton className="mb-3 h-9 w-full" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-[65%] rounded-[14px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
