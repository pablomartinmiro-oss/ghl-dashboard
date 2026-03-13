import { ConversationListSkeleton } from "@/components/shared/LoadingSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function CommsLoading() {
  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)]">
      <div className="w-80 shrink-0 border-r border-border bg-white p-3">
        <Skeleton className="mb-3 h-9 w-full" />
        <ConversationListSkeleton />
      </div>
      <div className="flex flex-1 items-center justify-center bg-white">
        <Skeleton className="h-8 w-48" />
      </div>
    </div>
  );
}
