import { useState } from "react";
import { useSearchParams } from "wouter";
import { useListNews, useTriggerNewsIngestion, useGetNewsStatus, type NewsItem, type NewsCredibility } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { useLikes } from "@/contexts/LikesContext";
import { ExternalLink, Loader2, Newspaper, RefreshCw, CheckCircle, HelpCircle, MessageCircle, Zap, Building2, Heart, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const CREDIBILITY_CONFIG: Record<NewsCredibility, {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.FC<{ className?: string }>;
  description: string;
}> = {
  verified: {
    label: "Verified",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/30",
    icon: ({ className }) => <CheckCircle className={className} />,
    description: "From major established outlets with concrete, attributed facts",
  },
  likely: {
    label: "Likely True",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/30",
    icon: ({ className }) => <CheckCircle className={className} />,
    description: "From reputable tech publications or well-sourced analysis",
  },
  unverified: {
    label: "Unverified",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
    icon: ({ className }) => <HelpCircle className={className} />,
    description: "Plausible but not independently confirmed",
  },
  gossip: {
    label: "Gossip",
    color: "text-rose-400",
    bg: "bg-rose-400/10",
    border: "border-rose-400/30",
    icon: ({ className }) => <MessageCircle className={className} />,
    description: "Social media, anonymous sources, or unverified rumours",
  },
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  "major-outlet": "Major Outlet",
  "tech-blog": "Tech Blog",
  "newsletter": "Newsletter",
  "social": "Social Media",
  "forum": "Forum",
};

function CredibilityBadge({ rating }: { rating: NewsCredibility }) {
  const cfg = CREDIBILITY_CONFIG[rating];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border", cfg.color, cfg.bg, cfg.border)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const cfg = CREDIBILITY_CONFIG[item.credibilityRating];
  const { isLiked, toggle } = useLikes();
  const liked = isLiked("news", item.id);
  return (
    <div className={cn(
      "group relative flex flex-col bg-card rounded-2xl border border-border p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5",
      item.highInterest && "border-l-4 border-l-amber-400",
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CredibilityBadge rating={item.credibilityRating} />
          {item.highInterest && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border bg-amber-400/10 border-amber-400/30 text-amber-400">
              <Zap className="w-3 h-3" />
              High Interest
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground" title={new Date(item.detectedAt).toLocaleString()}>
            {item.publishedAt
              ? formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true })
              : formatDistanceToNow(new Date(item.detectedAt), { addSuffix: true })}
          </span>
          <button
            onClick={() => toggle("news", item.id)}
            className={cn(
              "p-1.5 rounded-lg transition-all duration-200",
              liked
                ? "text-rose-400 hover:text-rose-300"
                : "text-muted-foreground hover:text-rose-400 hover:bg-rose-400/10"
            )}
            title={liked ? "Remove from Saved" : "Save for later"}
          >
            <Heart className={cn("w-4 h-4 transition-transform", liked && "fill-current scale-110")} />
          </button>
        </div>
      </div>

      <h3 className="text-base md:text-lg font-display font-bold text-foreground mb-2 leading-snug group-hover:text-primary transition-colors">
        {item.title}
      </h3>

      {item.summary && (
        <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-3">
          {item.summary}
        </p>
      )}

      {item.credibilityReason && (
        <div className={cn("mb-3 px-3 py-2 rounded-lg border text-xs", cfg.bg, cfg.border)}>
          <span className={cn("font-semibold", cfg.color)}>Why this rating: </span>
          <span className="text-muted-foreground">{item.credibilityReason}</span>
        </div>
      )}

      {item.mentionedVendors && item.mentionedVendors.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {item.mentionedVendors.map(v => (
            <span key={v} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
              <Building2 className="w-2.5 h-2.5" />
              {v}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Newspaper className="w-3.5 h-3.5" />
          <span>{item.sourceName}</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-muted-foreground/70">{SOURCE_TYPE_LABELS[item.sourceType] ?? item.sourceType}</span>
        </div>
        {item.sourceUrl && (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors bg-secondary px-3 py-1.5 rounded-lg border border-transparent hover:border-primary/20"
          >
            Source <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

const ALL_RATINGS: NewsCredibility[] = ["verified", "likely", "unverified", "gossip"];

export default function News() {
  const [selectedRatings, setSelectedRatings] = useState<NewsCredibility[]>([]);
  const [highInterestOnly, setHighInterestOnly] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 20;
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") ?? undefined;

  const { data, isLoading } = useListNews(
    {
      credibility: selectedRatings.length > 0 ? selectedRatings.join(",") : undefined,
      highInterest: highInterestOnly ? true : undefined,
      keyword: searchQuery,
      limit,
      offset: page * limit,
    },
    {
      query: {
        queryKey: ["/api/v1/news", selectedRatings.join(","), highInterestOnly, page, searchQuery],
        refetchInterval: 30000,
      },
    }
  );

  const { data: status } = useGetNewsStatus({
    query: { refetchInterval: 10000 },
  });

  const triggerIngestion = useTriggerNewsIngestion();

  const toggleRating = (r: NewsCredibility) => {
    setSelectedRatings(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
    setPage(0);
  };

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row gap-8">

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">News & Gossip</h1>
            <p className="text-muted-foreground">
              AI industry news from major outlets, tech blogs, social media, and community sources — rated from Verified to Gossip by Claude.
            </p>
          </div>

          {searchQuery && (
            <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-sm text-primary">
              <Search className="w-4 h-4 shrink-0" />
              <span>Results for <span className="font-semibold">"{searchQuery}"</span></span>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p>Gathering intelligence...</p>
            </div>
          ) : !data?.news.length ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card/30 border border-dashed border-border rounded-3xl">
              <Newspaper className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium text-foreground mb-1">No news found</p>
              <p className="text-sm text-center max-w-md">Adjust your filters or trigger a news scan to pull in the latest items.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {data.news.map(item => (
                <NewsCard key={item.id} item={item} />
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
                  disabled={!data || data.news.length < limit}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="sticky top-6 max-h-[calc(100vh-5rem)] overflow-y-auto space-y-4 pr-1">

            {/* Scan status + trigger */}
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-foreground">News Scan</span>
                <button
                  onClick={() => triggerIngestion.mutate()}
                  disabled={triggerIngestion.isPending || status?.isRunning}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                  title="Trigger news scan"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", status?.isRunning && "animate-spin text-primary")} />
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  status?.isRunning ? "bg-primary animate-pulse shadow-[0_0_6px_currentColor]" : "bg-muted-foreground/40"
                )} />
                {status?.isRunning ? "Scanning news sources..." : "Idle"}
              </div>
              {status?.lastRunAt && (
                <p className="text-xs text-muted-foreground/60 mt-2">
                  Last scan {formatDistanceToNow(new Date(status.lastRunAt), { addSuffix: true })}
                </p>
              )}
              {status?.totalItems !== undefined && (
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {status.totalItems} items in database
                </p>
              )}
            </div>

            {/* Filters */}
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-5 shadow-lg">
              <h3 className="text-sm font-semibold text-foreground mb-4">Filters</h3>

              {/* High interest toggle */}
              <div className="mb-5">
                <button
                  onClick={() => { setHighInterestOnly(!highInterestOnly); setPage(0); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all",
                    highInterestOnly
                      ? "bg-amber-400/10 border-amber-400/40 text-amber-400"
                      : "bg-background border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Zap className={cn("w-4 h-4", highInterestOnly ? "text-amber-400" : "text-muted-foreground")} />
                  High Interest Only
                  {highInterestOnly && <span className="ml-auto w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                </button>
              </div>

              {/* Credibility filters */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Credibility</h4>
                <div className="space-y-2">
                  {ALL_RATINGS.map(rating => {
                    const cfg = CREDIBILITY_CONFIG[rating];
                    const Icon = cfg.icon;
                    const active = selectedRatings.includes(rating);
                    return (
                      <button
                        key={rating}
                        onClick={() => toggleRating(rating)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm border transition-all text-left",
                          active
                            ? cn(cfg.bg, cfg.border, cfg.color)
                            : "bg-background border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{cfg.label}</div>
                          <div className="text-xs text-muted-foreground leading-tight mt-0.5 line-clamp-1">{cfg.description}</div>
                        </div>
                        {active && <div className={cn("w-2 h-2 rounded-full shrink-0", cfg.color.replace("text-", "bg-"))} />}
                      </button>
                    );
                  })}
                </div>
                {selectedRatings.length > 0 && (
                  <button
                    onClick={() => { setSelectedRatings([]); setPage(0); }}
                    className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground text-center py-1"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="bg-card/30 border border-border/50 rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Rating Scale</p>
              <div className="space-y-2">
                {ALL_RATINGS.map(r => {
                  const cfg = CREDIBILITY_CONFIG[r];
                  return (
                    <div key={r} className="flex items-start gap-2">
                      <span className={cn("text-xs font-semibold w-20 shrink-0 mt-0.5", cfg.color)}>{cfg.label}</span>
                      <span className="text-xs text-muted-foreground leading-tight">{cfg.description}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

      </div>
    </Layout>
  );
}
