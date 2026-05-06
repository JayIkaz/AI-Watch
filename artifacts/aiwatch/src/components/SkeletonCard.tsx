import { cn } from "@/lib/utils";

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/40",
        className
      )}
    />
  );
}

export function SkeletonUpdateCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn(
      "flex flex-col bg-card rounded-2xl border border-border",
      compact ? "p-3 md:p-4" : "p-5 md:p-6"
    )}>
      <div className={cn("flex items-start justify-between gap-3", compact ? "mb-2" : "mb-3")}>
        <div className="flex items-center gap-3 min-w-0">
          <Shimmer className={cn("rounded-xl shrink-0", compact ? "w-8 h-8" : "w-10 h-10")} />
          <div className="min-w-0 space-y-1.5">
            <Shimmer className="h-3.5 w-20" />
            <div className="flex items-center gap-2">
              <Shimmer className="h-4 w-16 rounded-full" />
              <Shimmer className="h-3 w-14" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Shimmer className="h-5 w-20 rounded-full" />
        </div>
      </div>

      <Shimmer className={cn("w-full", compact ? "h-4 mb-2" : "h-5 mb-2")} />
      <Shimmer className={cn("w-3/4", compact ? "h-4 mb-2" : "h-5 mb-3")} />

      {!compact && (
        <>
          <Shimmer className="h-3.5 w-full mb-1" />
          <Shimmer className="h-3.5 w-5/6 mb-3" />

          <div className="mb-3 p-3 rounded-xl border border-border/60 bg-muted/10 space-y-2">
            <Shimmer className="h-3 w-24" />
            <Shimmer className="h-3.5 w-full" />
            <Shimmer className="h-3.5 w-4/5" />
          </div>
        </>
      )}

      <div className={cn("mt-auto flex items-center justify-between border-t border-border/40", compact ? "pt-2" : "pt-3")}>
        <div className="flex items-center gap-3">
          <Shimmer className="h-4 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4].map(i => (
            <Shimmer key={i} className="w-8 h-8 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonNewsCard() {
  return (
    <div className="flex flex-col bg-card rounded-2xl border border-border p-5 md:p-6 gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Shimmer className="h-6 w-20 rounded-full" />
          <Shimmer className="h-6 w-24 rounded-full" />
          <Shimmer className="h-6 w-16 rounded-full" />
        </div>
        <Shimmer className="h-3.5 w-16 shrink-0" />
      </div>

      <Shimmer className="h-5 w-full" />
      <Shimmer className="h-5 w-3/4" />

      <div className="space-y-1.5">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="h-3.5 w-full" />
        <Shimmer className="h-3.5 w-5/6" />
      </div>

      <div className="p-3 rounded-xl border border-border/60 bg-muted/10 space-y-1.5">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="h-3.5 w-full" />
        <Shimmer className="h-3.5 w-4/5" />
      </div>

      <div className="border-t border-border/40 pt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shimmer className="h-3.5 w-3.5 rounded" />
          <Shimmer className="h-3.5 w-28" />
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(i => (
            <Shimmer key={i} className="w-9 h-9 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
