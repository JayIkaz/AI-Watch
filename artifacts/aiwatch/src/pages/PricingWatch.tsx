import { keepPreviousData } from "@tanstack/react-query";
import { useListUpdates, useListVendors, useGetVendorCounts, getListUpdatesQueryKey, getListVendorsQueryKey, getGetVendorCountsQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { UpdateCard } from "@/components/UpdateCard";
import { SkeletonUpdateCard } from "@/components/SkeletonCard";
import { RefreshingBar } from "@/components/RefreshingBar";
import { DollarSign, Database, Zap, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const CATEGORY = "pricing";

export default function PricingWatch() {
  const [page, setPage] = useState(0);
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [highImpactOnly, setHighImpactOnly] = useState(false);
  const limit = 20;

  const { data: vendorsData } = useListVendors({}, { query: { queryKey: getListVendorsQueryKey({}), staleTime: 5 * 60 * 1000 } });

  const countsParams = { category: CATEGORY };
  const { data: countsData } = useGetVendorCounts(countsParams, {
    query: { queryKey: getGetVendorCountsQueryKey(countsParams), staleTime: 5 * 60 * 1000 },
  });

  const countMap = new Map((countsData?.counts ?? []).map((c) => [c.slug, c.count]));

  const vendorParam = selectedVendors.size > 0 ? [...selectedVendors].join(",") : undefined;

  const params = {
    category: CATEGORY,
    vendor: vendorParam,
    highImpact: highImpactOnly ? true : undefined,
    limit,
    offset: page * limit,
  };

  const { data, isLoading, isFetching } = useListUpdates(params, {
    query: {
      queryKey: getListUpdatesQueryKey(params),
      staleTime: 5 * 60 * 1000,
      placeholderData: keepPreviousData,
    },
  });

  const visible = data?.updates ?? [];
  const hasFilters = selectedVendors.size > 0 || highImpactOnly;

  function resetFilters() {
    setSelectedVendors(new Set());
    setHighImpactOnly(false);
    setPage(0);
  }

  function toggleVendor(slug: string) {
    const isAlreadySelected = selectedVendors.has(slug);
    const vendorCount = countsData ? (countMap.get(slug) ?? 0) : undefined;
    if (!isAlreadySelected && vendorCount === 0 && countsData) return;
    setSelectedVendors((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
    setPage(0);
  }

  const vendorLabel =
    selectedVendors.size === 0
      ? null
      : selectedVendors.size === 1
      ? null
      : `${selectedVendors.size} vendors`;

  return (
    <Layout>
      <div className="max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-teal/10 border border-teal/20 shrink-0">
            <DollarSign className="w-6 h-6 text-teal" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-display font-bold text-foreground mb-1">Pricing Watch</h1>
            <p className="text-muted-foreground">
              Track price changes, new tiers, and cost announcements across all major AI vendors.
            </p>
            {data && (
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-semibold text-foreground">{data.total}</span> pricing updates tracked
              </p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-3">
          {/* High impact toggle + clear */}
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
            {vendorLabel && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal/15 border border-teal/40 text-teal">
                {vendorLabel}
              </span>
            )}
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
          {vendorsData?.vendors && vendorsData.vendors.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {vendorsData.vendors.map((v) => {
                const hasCount = countsData !== undefined;
                const vendorCount = hasCount ? (countMap.get(v.slug) ?? 0) : undefined;
                const isZero = hasCount && vendorCount === 0;
                const isSelected = selectedVendors.has(v.slug);
                return (
                  <button
                    key={v.slug}
                    onClick={() => toggleVendor(v.slug)}
                    disabled={isZero && !isSelected}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      isSelected
                        ? "bg-teal/15 border-teal/40 text-teal"
                        : isZero
                        ? "bg-card border-border text-muted-foreground opacity-35 cursor-not-allowed"
                        : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                    )}
                  >
                    {v.name}
                    {hasCount && vendorCount !== undefined && vendorCount > 0 && (
                      <span
                        className={cn(
                          "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums",
                          isSelected
                            ? "bg-teal/30 text-teal"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {vendorCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Background refresh indicator */}
        <RefreshingBar visible={isFetching && !isLoading} />

        {/* Feed */}
        {isLoading ? (
          <div className="space-y-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonUpdateCard key={i} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card/30 border border-dashed border-border rounded-3xl">
            <Database className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium text-foreground mb-1">
              {hasFilters ? "No pricing updates match these filters" : "No pricing updates found"}
            </p>
            <p className="text-sm text-center max-w-md">
              {hasFilters
                ? "Try clearing filters or selecting a different vendor."
                : "Pricing signals will appear here as they're detected."}
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
                disabled={!data?.updates || data.updates.length < limit}
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
