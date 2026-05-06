import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useListUpdates, useListVendors, useListCategories } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { UpdateCard } from "@/components/UpdateCard";
import { SkeletonUpdateCard } from "@/components/SkeletonCard";
import { Filter, X, Database, CheckCircle2, Zap, Search, TrendingUp, DollarSign, Cpu, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeedPrefs } from "@/contexts/FeedPrefsContext";
import { useSearchParams } from "wouter";
import { MobileSearchBar } from "@/components/MobileSearchBar";

type QuickFilter = "high-impact" | "model-releases" | "pricing" | "api-changes" | "safety" | "last-24h";

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: "high-impact",     label: "High Impact" },
  { id: "model-releases",  label: "Model Releases" },
  { id: "pricing",         label: "Pricing Changes" },
  { id: "api-changes",     label: "API Changes" },
  { id: "safety",          label: "Safety & Policy" },
  { id: "last-24h",        label: "Last 24h" },
];

const SIGNAL_TYPES = [
  { id: "official",  label: "Official updates",      category: undefined,       desc: "From vendor channels" },
  { id: "pricing",   label: "Pricing changes",        category: "pricing",       desc: undefined },
  { id: "api",       label: "Breaking API changes",   category: "api-changelog", desc: undefined },
];

export default function Feed() {
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const [activeQuickFilters, setActiveQuickFilters] = useState<Set<QuickFilter>>(new Set());
  const limit = 20;
  const { highImpactOnly, setHighImpactOnly } = useFeedPrefs();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") ?? undefined;

  const isLast24h = activeQuickFilters.has("last-24h");
  const chipHighImpact = activeQuickFilters.has("high-impact") || highImpactOnly;

  const chipCategories = Array.from(activeQuickFilters)
    .flatMap(f => {
      if (f === "model-releases") return ["model-release"];
      if (f === "pricing")        return ["pricing"];
      if (f === "api-changes")    return ["api-changelog"];
      if (f === "safety")         return ["safety"];
      return [];
    });

  const effectiveCategories = [...new Set([...selectedCategories, ...chipCategories])];

  const date24hAgo = isLast24h
    ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    : undefined;

  const { data: updatesData, isLoading: isLoadingUpdates, isError: isErrorUpdates } = useListUpdates(
    {
      vendor:     selectedVendors.join(",") || undefined,
      category:   effectiveCategories.join(",") || undefined,
      highImpact: chipHighImpact ? true : undefined,
      keyword:    searchQuery,
      date_from:  date24hAgo,
      limit,
      offset: page * limit,
    },
    {
      query: {
        queryKey: [
          "/api/v1/updates",
          selectedVendors.join(","),
          effectiveCategories.join(","),
          page, chipHighImpact, searchQuery, date24hAgo,
        ],
        placeholderData: keepPreviousData,
        staleTime: 2 * 60 * 1000,
      },
    }
  );

  const { data: statsHighImpact }   = useListUpdates({ highImpact: true,           limit: 1 }, { query: { staleTime: 60_000 } });
  const { data: statsPricing }      = useListUpdates({ category: "pricing",         limit: 1 }, { query: { staleTime: 60_000 } });
  const { data: statsModels }       = useListUpdates({ category: "model-release",   limit: 1 }, { query: { staleTime: 60_000 } });
  const { data: vendorsData }       = useListVendors({});
  const { data: categoriesData }    = useListCategories({});

  const toggleVendor = (slug: string) => {
    setSelectedVendors(prev => prev.includes(slug) ? prev.filter(v => v !== slug) : [...prev, slug]);
    setPage(0);
  };
  const toggleCategory = (slug: string) => {
    setSelectedCategories(prev => prev.includes(slug) ? prev.filter(c => c !== slug) : [...prev, slug]);
    setPage(0);
  };
  const toggleQuickFilter = (f: QuickFilter) => {
    if (f === "high-impact") {
      setHighImpactOnly(!highImpactOnly);
      setActiveQuickFilters(prev => {
        const next = new Set(prev);
        if (next.has(f)) next.delete(f); else next.add(f);
        return next;
      });
    } else {
      setActiveQuickFilters(prev => {
        const next = new Set(prev);
        if (next.has(f)) next.delete(f); else next.add(f);
        return next;
      });
    }
    setPage(0);
  };
  const toggleSignalType = (category?: string) => {
    if (!category) return;
    toggleCategory(category);
  };

  const visibleUpdates = (updatesData?.updates ?? []).filter(u => !hiddenIds.has(u.id));
  const hasActiveFilters = selectedVendors.length > 0 || selectedCategories.length > 0 || activeQuickFilters.size > 0;

  const statCards = [
    { label: "High-impact updates", value: statsHighImpact?.total ?? "—", icon: Zap,         color: "text-primary" },
    { label: "Pricing changes",      value: statsPricing?.total   ?? "—", icon: DollarSign,   color: "text-green-400" },
    { label: "Model releases",        value: statsModels?.total    ?? "—", icon: Cpu,          color: "text-blue-400" },
    { label: "Vendors tracked",       value: vendorsData?.vendors.length ?? "—", icon: Building2, color: "text-purple-400" },
  ];

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row gap-8">

        {/* Main Feed Column */}
        <div className="flex-1 min-w-0">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-display font-bold text-foreground mb-1">Today's AI Intelligence</h1>
            <p className="text-muted-foreground">Ranked AI model releases, API changes, pricing updates, and industry signals.</p>
          </div>

          {/* Mobile-only search bar */}
          <MobileSearchBar />

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {statCards.map(card => (
              <div key={card.label} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <div className={cn("p-1.5 rounded-lg bg-secondary shrink-0", card.color)}>
                  <card.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className={cn("text-xl font-bold leading-none mb-0.5", card.color)}>{String(card.value)}</div>
                  <div className="text-xs text-muted-foreground leading-tight truncate">{card.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick filter chips */}
          <div className="flex flex-wrap gap-2 mb-5">
            {QUICK_FILTERS.map(chip => {
              const active = activeQuickFilters.has(chip.id) || (chip.id === "high-impact" && highImpactOnly);
              return (
                <button
                  key={chip.id}
                  onClick={() => toggleQuickFilter(chip.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    active
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                  )}
                >
                  {chip.label}
                </button>
              );
            })}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSelectedVendors([]);
                  setSelectedCategories([]);
                  setActiveQuickFilters(new Set());
                  setHighImpactOnly(false);
                  setPage(0);
                }}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-border/80 flex items-center gap-1 transition-all"
              >
                Clear all <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Search indicator */}
          {searchQuery && (
            <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-sm text-primary">
              <Search className="w-4 h-4 shrink-0" />
              <span>Results for <span className="font-semibold">"{searchQuery}"</span></span>
            </div>
          )}

          {/* Feed */}
          {isLoadingUpdates ? (
            <div className="space-y-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonUpdateCard key={i} />
              ))}
            </div>
          ) : isErrorUpdates && visibleUpdates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card/30 border border-dashed border-border rounded-3xl">
              <Database className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium text-foreground mb-1">Unable to load updates</p>
              <p className="text-sm text-center max-w-md">
                The server may be temporarily unavailable. Cached data will appear automatically when connectivity is restored.
              </p>
            </div>
          ) : visibleUpdates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card/30 border border-dashed border-border rounded-3xl">
              <Database className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium text-foreground mb-1">
                {hasActiveFilters ? "No updates match these filters" : "No intelligence found"}
              </p>
              <p className="text-sm text-center max-w-md">
                {hasActiveFilters
                  ? "Try clearing filters or widening your watchlist."
                  : "Wait for the ingestion pipeline to pick up new updates."}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={() => { setSelectedVendors([]); setSelectedCategories([]); setActiveQuickFilters(new Set()); setHighImpactOnly(false); setPage(0); }}
                  className="mt-4 px-4 py-2 rounded-xl text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {visibleUpdates.map(update => (
                <UpdateCard
                  key={update.id}
                  update={update}
                  onHide={() => setHiddenIds(prev => new Set([...prev, update.id]))}
                />
              ))}

              <div className="pt-8 flex items-center justify-between border-t border-border">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">Page {page + 1}</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!updatesData || updatesData.updates.length < limit}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filters Sidebar */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="sticky top-6 flex flex-col max-h-[calc(100vh-5rem)] bg-card/50 backdrop-blur-sm border border-border rounded-2xl shadow-lg overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border/60 text-foreground font-display font-bold shrink-0">
              <Filter className="w-4 h-4 text-primary" />
              Filters
              {hasActiveFilters && (
                <button
                  onClick={() => { setSelectedVendors([]); setSelectedCategories([]); setActiveQuickFilters(new Set()); setHighImpactOnly(false); setPage(0); }}
                  className="ml-auto text-xs font-normal text-muted-foreground hover:text-foreground flex items-center gap-1 bg-secondary px-2 py-1 rounded-md"
                >
                  Clear all <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">

              {/* Quick Filter */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Quick Filter</h3>
                <button
                  onClick={() => { setHighImpactOnly(!highImpactOnly); setPage(0); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all",
                    highImpactOnly
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                  )}
                >
                  <Zap className={cn("w-4 h-4", highImpactOnly ? "text-primary" : "text-muted-foreground")} />
                  High-Impact Only
                  {highImpactOnly && <span className="ml-auto w-2 h-2 rounded-full bg-primary animate-pulse" />}
                </button>
              </div>

              {/* Signal Type */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Signal Type</h3>
                <div className="space-y-1.5">
                  {SIGNAL_TYPES.map(st => {
                    const active = st.category ? selectedCategories.includes(st.category) : false;
                    return (
                      <button
                        key={st.id}
                        onClick={() => toggleSignalType(st.category)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm border transition-all text-left",
                          active
                            ? "bg-primary/10 border-primary/40 text-primary font-medium"
                            : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-border/80",
                          !st.category && "opacity-50 cursor-default"
                        )}
                        disabled={!st.category}
                        title={st.desc}
                      >
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                        {st.label}
                        {active && <CheckCircle2 className="ml-auto w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Categories */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Categories</h3>
                <div className="space-y-2">
                  {categoriesData?.categories.map(cat => (
                    <label key={cat.id} onClick={() => toggleCategory(cat.slug)} className="flex items-center gap-3 group cursor-pointer">
                      <div className={cn(
                        "w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0",
                        selectedCategories.includes(cat.slug) ? "bg-primary border-primary" : "border-muted-foreground/30 group-hover:border-primary/50 bg-background"
                      )}>
                        {selectedCategories.includes(cat.slug) && <CheckCircle2 className="w-3 h-3 text-background" />}
                      </div>
                      <span className={cn("text-sm transition-colors", selectedCategories.includes(cat.slug) ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground")}>
                        {cat.name}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground/50">{cat.updateCount}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Vendors */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Vendors</h3>
                <div className="space-y-2">
                  {vendorsData?.vendors.map(vendor => (
                    <label key={vendor.id} onClick={() => toggleVendor(vendor.slug)} className="flex items-center gap-3 group cursor-pointer">
                      <div className={cn(
                        "w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0",
                        selectedVendors.includes(vendor.slug) ? "bg-primary border-primary" : "border-muted-foreground/30 group-hover:border-primary/50 bg-background"
                      )}>
                        {selectedVendors.includes(vendor.slug) && <CheckCircle2 className="w-3 h-3 text-background" />}
                      </div>
                      <span className={cn("text-sm transition-colors truncate", selectedVendors.includes(vendor.slug) ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground")}>
                        {vendor.name}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground/50 shrink-0">{vendor.updateCount}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
