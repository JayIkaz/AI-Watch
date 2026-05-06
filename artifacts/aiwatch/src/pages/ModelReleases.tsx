import { useListUpdates, useListVendors, getListUpdatesQueryKey, getListVendorsQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { UpdateCard } from "@/components/UpdateCard";
import { Loader2, Cpu, Database, Zap, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function ModelReleases() {
  const [page, setPage] = useState(0);
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [highImpactOnly, setHighImpactOnly] = useState(false);
  const limit = 20;

  const { data: vendorsData } = useListVendors({}, { query: { queryKey: getListVendorsQueryKey({}), staleTime: 5 * 60 * 1000 } });

  const params = {
    category: "model-release",
    vendor: selectedVendor ?? undefined,
    highImpact: highImpactOnly ? true : undefined,
    limit,
    offset: page * limit,
  };

  const { data, isLoading } = useListUpdates(params, {
    query: {
      queryKey: getListUpdatesQueryKey(params),
      staleTime: 5 * 60 * 1000,
    },
  });

  const visible = (data?.updates ?? []).filter((u) => !hiddenIds.has(u.id));
  const hasFilters = selectedVendor !== null || highImpactOnly;

  function resetFilters() {
    setSelectedVendor(null);
    setHighImpactOnly(false);
    setPage(0);
  }

  function selectVendor(slug: string) {
    setSelectedVendor((prev) => (prev === slug ? null : slug));
    setPage(0);
  }

  return (
    <Layout>
      <div className="max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-blue-400/10 border border-blue-400/20 shrink-0">
            <Cpu className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-display font-bold text-foreground mb-1">Model Releases</h1>
            <p className="text-muted-foreground">
              New models, capability announcements, and version updates from all tracked AI vendors.
            </p>
            {data && (
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-semibold text-foreground">{data.total}</span> model releases tracked
              </p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-3">
          {/* High impact toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setHighImpactOnly((v) => !v); setPage(0); }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                highImpactOnly
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/80"
              )}
            >
              <Zap className="w-3.5 h-3.5" />
              High Impact Only
            </button>
            {hasFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-border text-muted-foreground hover:text-foreground transition-all"
              >
                Clear filters <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Vendor chips */}
          {vendorsData && vendorsData.vendors.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {vendorsData.vendors.map((v) => (
                <button
                  key={v.slug}
                  onClick={() => selectVendor(v.slug)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    selectedVendor === v.slug
                      ? "bg-blue-400/15 border-blue-400/40 text-blue-400"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                  )}
                >
                  {v.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Feed */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p>Loading model releases...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card/30 border border-dashed border-border rounded-3xl">
            <Database className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium text-foreground mb-1">
              {hasFilters ? "No model releases match these filters" : "No model releases found"}
            </p>
            <p className="text-sm text-center max-w-md">
              {hasFilters
                ? "Try clearing filters or selecting a different vendor."
                : "Model announcements will appear here as they're detected."}
            </p>
            {hasFilters && (
              <button
                onClick={resetFilters}
                className="mt-4 px-4 py-2 rounded-xl text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {visible.map((u) => (
              <UpdateCard
                key={u.id}
                update={u}
                onHide={() => setHiddenIds((p) => new Set([...p, u.id]))}
              />
            ))}
            <div className="pt-8 flex items-center justify-between border-t border-border">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">Page {page + 1}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!data || data.updates.length < limit}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
