import { useListUpdates, getListUpdatesQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Loader2, Zap, BookOpen, ExternalLink, ShieldAlert, ArrowRight, DollarSign, Cpu, Code2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn, getCategoryColor, decodeHtml } from "@/lib/utils";
import { Link } from "wouter";

function getRecommendedAction(slug: string): string {
  const map: Record<string, string> = {
    "pricing":       "Review pricing",
    "model-release": "Test & evaluate",
    "api-changelog": "Update integration",
    "safety":        "Monitor",
    "research":      "Monitor",
    "product":       "Review",
  };
  return map[slug] || "Review";
}

function getImpactColor(highImpact: boolean, score?: number | null) {
  if (highImpact) return "text-primary";
  if ((score ?? 0) >= 0.6) return "text-amber-400";
  return "text-muted-foreground";
}

const STAT_CATEGORIES = [
  { label: "Pricing changes",  slug: "pricing",       icon: DollarSign, color: "text-green-400",  bg: "bg-green-400/10",  href: "/pricing" },
  { label: "Model releases",   slug: "model-release", icon: Cpu,        color: "text-blue-400",   bg: "bg-blue-400/10",   href: "/model-releases" },
  { label: "API changes",      slug: "api-changelog", icon: Code2,      color: "text-orange-400", bg: "bg-orange-400/10", href: "/api-changes" },
];

export default function DailyBrief() {
  const today = new Date();
  const formatted = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const highImpactParams = { highImpact: true, limit: 5 } as const;
  const recentParams = { limit: 20 } as const;

  const { data, isLoading } = useListUpdates(
    highImpactParams,
    { query: { queryKey: getListUpdatesQueryKey(highImpactParams), staleTime: 5 * 60 * 1000 } }
  );

  const { data: recentData, isLoading: recentLoading } = useListUpdates(
    recentParams,
    { query: { queryKey: getListUpdatesQueryKey(recentParams), staleTime: 5 * 60 * 1000 } }
  );

  const { data: pricingStats }  = useListUpdates({ category: "pricing",       limit: 1 }, { query: { queryKey: getListUpdatesQueryKey({ category: "pricing",       limit: 1 }), staleTime: 60_000 } });
  const { data: modelStats }    = useListUpdates({ category: "model-release", limit: 1 }, { query: { queryKey: getListUpdatesQueryKey({ category: "model-release", limit: 1 }), staleTime: 60_000 } });
  const { data: apiStats }      = useListUpdates({ category: "api-changelog", limit: 1 }, { query: { queryKey: getListUpdatesQueryKey({ category: "api-changelog", limit: 1 }), staleTime: 60_000 } });

  const statTotals: Record<string, number | undefined> = {
    "pricing":       pricingStats?.total,
    "model-release": modelStats?.total,
    "api-changelog": apiStats?.total,
  };

  const highImpactItems = data?.updates ?? [];

  const fillerItems = (recentData?.updates ?? [])
    .filter(u => !highImpactItems.find(h => h.id === u.id))
    .slice(0, Math.max(0, 5 - highImpactItems.length));

  const briefItems = [...highImpactItems, ...fillerItems].slice(0, 5);

  return (
    <Layout>
      <div className="max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-widest mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            Daily Brief
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-1">
            {formatted}
          </h1>
          <p className="text-muted-foreground">
            The 5 most important AI intelligence signals you need to know today.
          </p>
        </div>

        {/* Category stats strip */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {STAT_CATEGORIES.map(({ label, slug, icon: Icon, color, bg, href }) => (
            <Link
              key={slug}
              href={href}
              className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 hover:border-primary/30 hover:shadow-md transition-all group"
            >
              <div className={cn("p-1.5 rounded-lg shrink-0", bg, color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className={cn("text-xl font-bold leading-none mb-0.5", color)}>
                  {statTotals[slug] ?? "—"}
                </div>
                <div className="text-xs text-muted-foreground leading-tight truncate">{label}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Brief items */}
        {isLoading || recentLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p>Compiling today's brief...</p>
          </div>
        ) : briefItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card/30 border border-dashed border-border rounded-3xl">
            <BookOpen className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium text-foreground mb-1">No brief available yet</p>
            <p className="text-sm text-center max-w-md">Trigger an ingestion scan to populate your Daily Brief.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {briefItems.map((item, idx) => {
              const whyItMatters = item.whyItMatters || item.summary || `Update from ${item.vendor.name} in ${item.category.name}.`;
              const action = getRecommendedAction(item.category.slug);
              const impactLabel = item.highImpact ? "High" : (item.confidenceScore ?? 0) >= 0.6 ? "Medium" : "Low";
              const impactColor = getImpactColor(item.highImpact, item.confidenceScore);

              return (
                <div
                  key={item.id}
                  className={cn(
                    "bg-card border rounded-2xl p-5 md:p-6 transition-all duration-200 hover:shadow-lg",
                    item.highImpact
                      ? "border-l-[3px] border-l-primary border-t border-r border-b border-primary/20"
                      : "border-border hover:border-border/80"
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Index */}
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 mt-0.5",
                      item.highImpact ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                    )}>
                      {idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Meta */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-semibold text-muted-foreground">{item.vendor.name}</span>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", getCategoryColor(item.category.slug))}>
                          {item.category.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.detectedAt), { addSuffix: true })}
                        </span>
                      </div>

                      {/* Headline */}
                      <h2 className="text-base font-display font-bold text-foreground mb-2 leading-snug">
                        {decodeHtml(item.title)}
                      </h2>

                      {/* Why it matters */}
                      <div className="mb-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <ShieldAlert className={cn("w-3.5 h-3.5 shrink-0", item.highImpact ? "text-primary" : "text-muted-foreground")} />
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Why it matters</span>
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed">{whyItMatters}</p>
                      </div>

                      {/* Impact + Action */}
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          Impact:
                          <span className={cn("font-semibold", impactColor)}>{impactLabel}</span>
                        </span>
                        {item.highImpact && <Zap className="w-3.5 h-3.5 text-primary" />}
                        <span className="text-muted-foreground">
                          Recommended action:
                          <span className="ml-1 font-semibold text-foreground">{action}</span>
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        {item.sourceUrl && (
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                          >
                            Source <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="pt-4 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                View full Intelligence Feed <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
