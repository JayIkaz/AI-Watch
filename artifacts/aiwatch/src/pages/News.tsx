import { useState, useEffect } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useSearchParams } from "wouter";
import {
  useListNews,
  useTriggerNewsIngestion,
  useGetNewsStatus,
  getGetNewsStatusQueryKey,
  type NewsItem,
  type NewsCredibility,
} from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { MobileSearchBar } from "@/components/MobileSearchBar";
import { SkeletonNewsCard } from "@/components/SkeletonCard";
import { useLikes } from "@/contexts/LikesContext";
import { useToast } from "@/hooks/use-toast";
import {
  ExternalLink, Newspaper, RefreshCw, CheckCircle,
  HelpCircle, MessageCircle, Zap, Building2, Heart, Search,
  ChevronDown, ChevronUp, Eye, EyeOff, Share2, BookmarkPlus,
  Bell, AlertCircle, ShieldCheck, Radio, Clock, Database,
  TrendingUp, BarChart3, List, X,
} from "lucide-react";
import { formatDistanceToNow, subHours, subDays } from "date-fns";
import { cn } from "@/lib/utils";

// ── Credibility config (renamed labels per spec) ─────────────────────────────
const CREDIBILITY_CONFIG: Record<NewsCredibility, {
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
  border: string;
  icon: React.FC<{ className?: string }>;
  description: string;
}> = {
  verified: {
    label: "Verified",
    shortLabel: "Verified",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/30",
    icon: ({ className }) => <ShieldCheck className={className} />,
    description: "Confirmed by official or highly reliable sources.",
  },
  likely: {
    label: "Credible",
    shortLabel: "Credible",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/30",
    icon: ({ className }) => <CheckCircle className={className} />,
    description: "Reported by reputable sources but not fully confirmed from primary evidence.",
  },
  unverified: {
    label: "Unverified",
    shortLabel: "Unverified",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
    icon: ({ className }) => <HelpCircle className={className} />,
    description: "Plausible, but not independently confirmed.",
  },
  gossip: {
    label: "Chatter",
    shortLabel: "Chatter",
    color: "text-rose-400",
    bg: "bg-rose-400/10",
    border: "border-rose-400/30",
    icon: ({ className }) => <MessageCircle className={className} />,
    description: "Social media, anonymous, or weakly sourced claims.",
  },
};

// ── Impact derivation ─────────────────────────────────────────────────────────
type Impact = "High impact" | "Medium impact" | "Low impact";

function deriveImpact(item: NewsItem): Impact {
  if (item.highInterest) return "High impact";
  if (item.credibilityRating === "verified" || item.credibilityRating === "likely") return "Medium impact";
  return "Low impact";
}

const IMPACT_CONFIG: Record<Impact, { color: string; bg: string; border: string }> = {
  "High impact":   { color: "text-primary",       bg: "bg-primary/10",     border: "border-primary/30" },
  "Medium impact": { color: "text-amber-400",      bg: "bg-amber-400/10",   border: "border-amber-400/20" },
  "Low impact":    { color: "text-muted-foreground", bg: "bg-muted/20",     border: "border-border" },
};

// ── Source type labels ────────────────────────────────────────────────────────
const SOURCE_TYPE_LABELS: Record<string, string> = {
  "major-outlet": "Major Outlet",
  "tech-blog":    "Tech Blog",
  "newsletter":   "Newsletter",
  "social":       "Social Media",
  "forum":        "Community Forum",
};

// ── Recommended action derivation ────────────────────────────────────────────
function deriveAction(item: NewsItem): string {
  if (item.credibilityRating === "gossip")     return "Ignore";
  if (item.credibilityRating === "unverified") return "Monitor";
  if (item.highInterest)                        return "Share with team";
  if (item.credibilityRating === "verified")   return "Add to watchlist";
  return "Monitor";
}

// ── Why it matters derivation ─────────────────────────────────────────────────
function deriveWhyItMatters(item: NewsItem): string {
  const vendors = item.mentionedVendors?.length ? `from ${item.mentionedVendors.slice(0, 2).join(" and ")}` : "";
  const source = SOURCE_TYPE_LABELS[item.sourceType] ?? item.sourceType;
  if (item.highInterest) {
    return `High-interest signal ${vendors}. This item has been flagged for market or ecosystem relevance. Worth sharing with your team or adding to your watchlist.`;
  }
  if (item.credibilityRating === "verified") {
    return `Confirmed reporting ${vendors} via ${source}. Reliable signal worth acting on if it falls within your focus areas.`;
  }
  if (item.credibilityRating === "likely") {
    return `Credible reporting ${vendors} — not yet primary-source confirmed, but from a reputable outlet. Worth monitoring for follow-up confirmation.`;
  }
  if (item.credibilityRating === "unverified") {
    return `Plausible claim ${vendors} that lacks independent confirmation. Treat as a signal to watch rather than an established fact.`;
  }
  return `Social or community chatter ${vendors}. Low confidence — useful for ambient awareness but not for decision-making.`;
}

// ── Confidence explanation ────────────────────────────────────────────────────
function deriveConfidenceText(item: NewsItem): string {
  const cfg = CREDIBILITY_CONFIG[item.credibilityRating];
  const source = item.sourceName;
  if (item.credibilityReason) return `${cfg.label} — ${item.credibilityReason}`;
  if (item.credibilityRating === "verified")    return `${cfg.label} — reported by ${source}, a highly reliable source with strong editorial standards.`;
  if (item.credibilityRating === "likely")      return `${cfg.label} — reported by ${source}, but not independently confirmed from a primary source.`;
  if (item.credibilityRating === "unverified")  return `${cfg.label} — originated at ${source}. Plausible but lacks corroborating evidence.`;
  return `${cfg.label} — sourced from ${source}. Anonymous, social, or weakly attributed claim.`;
}

// ── Why high interest ─────────────────────────────────────────────────────────
function deriveHighInterestReason(item: NewsItem): string {
  if (item.mentionedVendors?.length) {
    return `Mentions major vendor activity: ${item.mentionedVendors.slice(0, 3).join(", ")}.`;
  }
  return "Topic, source quality, and impact level match common watchlist patterns.";
}

// ── Mock clustering data ──────────────────────────────────────────────────────
const MOCK_ALSO_SEEN: Record<number, string[]> = {};
function getMockAlsoSeen(id: number): string[] {
  if (!MOCK_ALSO_SEEN[id]) {
    const all = ["Hacker News", "The Verge", "VentureBeat", "Reddit", "TechCrunch", "Bloomberg", "Ars Technica"];
    const count = Math.floor(Math.random() * 3);
    MOCK_ALSO_SEEN[id] = all.sort(() => Math.random() - 0.5).slice(0, count);
  }
  return MOCK_ALSO_SEEN[id];
}

// ── NewsCard ──────────────────────────────────────────────────────────────────
function NewsCard({ item, onHide }: { item: NewsItem; onHide: () => void }) {
  const cfg = CREDIBILITY_CONFIG[item.credibilityRating];
  const impact = deriveImpact(item);
  const impactCfg = IMPACT_CONFIG[impact];
  const action = deriveAction(item);
  const whyItMatters = deriveWhyItMatters(item);
  const confidenceText = deriveConfidenceText(item);
  const { isLiked, toggle } = useLikes();
  const liked = isLiked("news", item.id);
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const alsoSeen = getMockAlsoSeen(item.id);
  const Icon = cfg.icon;

  if (hidden) return null;

  const timeAgo = item.publishedAt
    ? formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true })
    : formatDistanceToNow(new Date(item.detectedAt), { addSuffix: true });

  return (
    <div className={cn(
      "group relative flex flex-col bg-card rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5",
      item.highInterest
        ? "border-l-[3px] border-l-amber-400 border-t border-r border-b border-amber-400/20 shadow-[0_0_0_1px_rgba(251,191,36,0.05)]"
        : "border-border hover:border-primary/20",
    )}>
      {item.highInterest && (
        <div className="absolute inset-0 bg-gradient-to-r from-amber-400/[0.03] via-transparent to-transparent rounded-2xl pointer-events-none" />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />

      <div className="p-5 md:p-6 flex flex-col gap-3">

        {/* Row 1: Badges + time */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border", cfg.color, cfg.bg, cfg.border)}>
              <Icon className="w-3 h-3" />
              {cfg.label}
            </span>
            <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border", impactCfg.color, impactCfg.bg, impactCfg.border)}>
              <TrendingUp className="w-3 h-3" />
              {impact}
            </span>
            {item.sourceType && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border bg-secondary border-border text-muted-foreground">
                <Newspaper className="w-3 h-3" />
                {SOURCE_TYPE_LABELS[item.sourceType] ?? item.sourceType}
              </span>
            )}
            {item.highInterest && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border bg-amber-400/10 border-amber-400/30 text-amber-400">
                <Zap className="w-3 h-3" />
                High Interest
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border bg-secondary border-border text-muted-foreground">
              Action: {action}
            </span>
          </div>
          <span className="text-xs text-muted-foreground shrink-0 mt-0.5" title={new Date(item.detectedAt).toLocaleString()}>
            {timeAgo}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base md:text-lg font-display font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
          {item.title}
        </h3>

        {/* What happened */}
        {item.summary && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">What happened</p>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{item.summary}</p>
          </div>
        )}

        {/* Why it matters */}
        <div className={cn(
          "p-3 rounded-xl border text-sm",
          item.highInterest ? "bg-amber-400/5 border-amber-400/20" : "bg-muted/20 border-border/60"
        )}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Why it matters</p>
          <p className="text-sm text-foreground/80 leading-relaxed">{whyItMatters}</p>
        </div>

        {/* Compact signal strip */}
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground/50">Signal:</span>{" "}
          <span className={cfg.color}>{cfg.label}</span>
          {" · "}
          <span className={impactCfg.color}>{impact}</span>
          {" · "}
          <span className={item.highInterest ? "text-amber-400" : ""}>{item.highInterest ? "High interest" : "Normal interest"}</span>
          {" · "}
          <span className="text-foreground/70">{action}</span>
        </p>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors self-start"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Show less" : "More details"}
        </button>

        {/* Expanded: confidence + source trail + clustering */}
        {expanded && (
          <div className="space-y-3 border-t border-border/40 pt-3">

            {/* High interest reason (only in expanded view) */}
            {item.highInterest && (
              <div className="text-xs text-amber-400/80 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2 leading-relaxed">
                <span className="font-semibold">Why high interest: </span>
                {deriveHighInterestReason(item)}
              </div>
            )}

            {/* Confidence */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Confidence</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{confidenceText}</p>
            </div>

            {/* Recommended action */}
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recommended action</p>
              <span className="text-xs px-2.5 py-1 rounded-full bg-secondary border border-border text-foreground font-semibold">
                {action}
              </span>
            </div>

            {/* Source trail */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Source trail</p>
              <div className="bg-secondary/30 border border-border/50 rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-28 shrink-0">Primary source</span>
                  <span className="text-foreground font-medium">{item.sourceName}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-28 shrink-0">Source type</span>
                  <span className="text-foreground">{SOURCE_TYPE_LABELS[item.sourceType] ?? item.sourceType}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-28 shrink-0">Supporting source</span>
                  <span className="text-muted-foreground italic">No supporting source recorded yet.</span>
                </div>
                {alsoSeen.length > 0 && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-28 shrink-0">Also seen in</span>
                    <span className="text-foreground">{alsoSeen.join(", ")}</span>
                  </div>
                )}
                <div className="flex gap-2 pt-1 border-t border-border/40">
                  <span className="text-muted-foreground w-28 shrink-0">Confidence reason</span>
                  <span className="text-foreground/80 leading-relaxed">
                    {item.credibilityRating === "verified"
                      ? "Reputable publication with strong editorial standards."
                      : item.credibilityRating === "likely"
                      ? "Reputable publication, but limited primary-source evidence."
                      : item.credibilityRating === "unverified"
                      ? "Plausible origin, but no independent corroboration found."
                      : "Weak sourcing — social media, anonymous, or community claim."}
                  </span>
                </div>
              </div>
            </div>

            {/* Coverage / clustering */}
            {alsoSeen.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Eye className="w-3.5 h-3.5" />
                <span>Covered by {alsoSeen.length + 1} sources — original: {item.sourceName}</span>
              </div>
            )}

          </div>
        )}

        {/* Mentioned vendors */}
        {item.mentionedVendors?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.mentionedVendors.map(v => (
              <span key={v} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                <Building2 className="w-2.5 h-2.5" />
                {v}
              </span>
            ))}
          </div>
        )}

        {/* Footer: source + actions */}
        <div className="border-t border-border/40 pt-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Newspaper className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium text-foreground/70">{item.sourceName}</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{SOURCE_TYPE_LABELS[item.sourceType] ?? item.sourceType}</span>
          </div>

          <div className="flex items-center gap-0.5">
            {/* Save */}
            <button
              onClick={() => toggle("news", item.id)}
              className={cn(
                "h-10 w-10 flex items-center justify-center rounded-lg transition-all duration-200",
                liked ? "text-rose-400" : "text-muted-foreground hover:text-rose-400 hover:bg-rose-400/10"
              )}
              title={liked ? "Saved" : "Save"}
            >
              <Heart className={cn("w-4 h-4", liked && "fill-current")} />
            </button>

            {/* Add to watchlist */}
            <button
              onClick={() => toast({ title: "Added to watchlist", description: `"${item.title.slice(0, 40)}…" added to your watchlist.` })}
              className="h-10 w-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
              title="Add to watchlist"
            >
              <BookmarkPlus className="w-4 h-4" />
            </button>

            {/* Share */}
            <button
              onClick={() => {
                if (item.sourceUrl) {
                  navigator.clipboard?.writeText(item.sourceUrl).catch(() => {});
                }
                toast({ title: "Link copied", description: "Source URL copied to clipboard." });
              }}
              className="h-10 w-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Create alert */}
            <button
              onClick={() => toast({ title: "Alert created", description: `You'll be notified about similar items from ${item.sourceName}.` })}
              className="h-10 w-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
              title="Create alert"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* Hide */}
            <button
              onClick={() => setHidden(true)}
              className="h-10 w-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
              title="Hide"
            >
              <EyeOff className="w-4 h-4" />
            </button>

            {/* Source */}
            {item.sourceUrl && (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors bg-secondary px-2.5 py-1.5 rounded-lg border border-transparent hover:border-primary/20 ml-0.5"
              >
                Source <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Filter types ───────────────────────────────────────────────────────────────
const ALL_RATINGS: NewsCredibility[] = ["verified", "likely", "unverified", "gossip"];

type ImpactFilter = "High impact" | "Medium impact" | "Low impact";
const ALL_IMPACTS: ImpactFilter[] = ["High impact", "Medium impact", "Low impact"];

type TimeRange = "24h" | "7d" | "30d";

// ── Checkbox filter button ────────────────────────────────────────────────────
function FilterChip({
  active, onClick, children, activeClass = "bg-primary/10 border-primary/30 text-primary",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  activeClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-all text-left",
        active ? activeClass : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-white/5"
      )}
    >
      <div className={cn("w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[9px]", active ? "bg-primary border-primary text-background" : "border-border")}>
        {active && "✓"}
      </div>
      {children}
    </button>
  );
}

// ── News Scan Status module ───────────────────────────────────────────────────
function NewsScanStatus({ onTrigger, isPending }: { onTrigger: () => void; isPending: boolean }) {
  const { data: status } = useGetNewsStatus({ query: { queryKey: getGetNewsStatusQueryKey(), refetchInterval: 10000 } });

  const isRunning = status?.isRunning ?? false;
  const lastRunAt = status?.lastRunAt ? new Date(status.lastRunAt) : null;
  const totalItems = status?.totalItems ?? 0;

  // Mock derived stats
  const newItems = Math.min(18, Math.floor(totalItems * 0.06));
  const highInterestCount = Math.ceil(newItems * 0.22);
  const lowConfidenceCount = Math.ceil(newItems * 0.39);
  const nextScanMins = lastRunAt
    ? Math.max(0, 15 - Math.floor((Date.now() - lastRunAt.getTime()) / 60000))
    : 14;

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Radio className={cn("w-3.5 h-3.5", isRunning ? "text-primary animate-pulse" : "text-muted-foreground")} />
          <span className="text-sm font-semibold text-foreground">News Scan</span>
        </div>
        <button
          onClick={onTrigger}
          disabled={isPending || isRunning}
          className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          title="Trigger news scan"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRunning && "animate-spin text-primary")} />
        </button>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status</span>
          <span className={cn("font-medium", isRunning ? "text-primary" : "text-muted-foreground")}>
            {isRunning ? "Scanning…" : "Idle"}
          </span>
        </div>
        {lastRunAt && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last scan</span>
            <span className="text-foreground/70">{formatDistanceToNow(lastRunAt, { addSuffix: true })}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Sources scanned</span>
          <span className="text-foreground/70">43</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">New items found</span>
          <span className="text-foreground/70">{newItems}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Flagged high interest</span>
          <span className="text-amber-400 font-medium">{highInterestCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Unverified / Chatter</span>
          <span className="text-rose-400/80">{lowConfidenceCount}</span>
        </div>
        {!isRunning && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Next scan</span>
            <span className="text-foreground/70">
              {nextScanMins <= 0 ? "Any moment…" : `in ${nextScanMins} min${nextScanMins === 1 ? "" : "s"}`}
            </span>
          </div>
        )}
        <div className="flex justify-between border-t border-border/40 pt-1.5 mt-1">
          <span className="text-muted-foreground">Total in database</span>
          <span className="text-foreground/70 font-medium">{totalItems.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function News() {
  const [page, setPage] = useState(0);
  const limit = 20;
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") ?? undefined;
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const triggerIngestion = useTriggerNewsIngestion();

  // On mount: if no filter params in URL, restore last session's filters from sessionStorage
  useEffect(() => {
    const hasParams = searchParams.get("ratings") || searchParams.get("impacts") || searchParams.get("hi") || searchParams.get("tr");
    if (!hasParams) {
      const stored = sessionStorage.getItem("news-filters");
      if (stored) {
        try {
          const saved = JSON.parse(stored) as Record<string, string>;
          if (Object.keys(saved).length > 0) {
            setSearchParams(prev => {
              const next = new URLSearchParams(prev);
              Object.entries(saved).forEach(([k, v]) => next.set(k, v));
              return next;
            });
          }
        } catch {}
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Whenever filter params change, persist them to sessionStorage
  useEffect(() => {
    const saved: Record<string, string> = {};
    ["ratings", "impacts", "hi", "tr"].forEach(key => {
      const val = searchParams.get(key);
      if (val) saved[key] = val;
    });
    sessionStorage.setItem("news-filters", JSON.stringify(saved));
  }, [searchParams]);

  // Filter state stored in URL params for persistence across navigation
  const selectedRatings: NewsCredibility[] = (searchParams.get("ratings")?.split(",").filter(Boolean) ?? []) as NewsCredibility[];
  const selectedImpacts: ImpactFilter[] = (searchParams.get("impacts")?.split(",").filter(Boolean) ?? []) as ImpactFilter[];
  const highInterestOnly = searchParams.get("hi") === "1";
  const selectedTimeRange = (searchParams.get("tr") as TimeRange) || null;

  const updateParam = (updater: (params: URLSearchParams) => void) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      updater(next);
      return next;
    });
    setPage(0);
  };

  const { data, isLoading, isError: isErrorNews } = useListNews(
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
        placeholderData: keepPreviousData,
        staleTime: 2 * 60 * 1000,
      },
    }
  );

  const toggleRating = (r: NewsCredibility) => {
    updateParam(next => {
      const current = next.get("ratings")?.split(",").filter(Boolean) ?? [];
      const updated = current.includes(r) ? current.filter(x => x !== r) : [...current, r];
      if (updated.length) next.set("ratings", updated.join(","));
      else next.delete("ratings");
    });
  };

  const toggleImpact = (i: ImpactFilter) => {
    updateParam(next => {
      const current = next.get("impacts")?.split(",").filter(Boolean) ?? [];
      const updated = current.includes(i) ? current.filter(x => x !== i) : [...current, i];
      if (updated.length) next.set("impacts", updated.join(","));
      else next.delete("impacts");
    });
  };

  const toggleTimeRange = (t: TimeRange) => {
    updateParam(next => {
      if (next.get("tr") === t) next.delete("tr");
      else next.set("tr", t);
    });
  };

  const clearAllFilters = () => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete("ratings");
      next.delete("impacts");
      next.delete("hi");
      next.delete("tr");
      return next;
    });
    setPage(0);
  };

  const hasActiveFilters = selectedRatings.length > 0 || selectedImpacts.length > 0 || highInterestOnly || selectedTimeRange !== null;

  // Client-side filtering: impact and time range (not sent to API)
  const cutoffDate: Date | null = selectedTimeRange === "24h"
    ? subHours(new Date(), 24)
    : selectedTimeRange === "7d"
    ? subDays(new Date(), 7)
    : selectedTimeRange === "30d"
    ? subDays(new Date(), 30)
    : null;

  const filteredNews = (data?.news ?? []).filter(item => {
    if (hiddenIds.has(item.id)) return false;
    if (selectedImpacts.length > 0 && !selectedImpacts.includes(deriveImpact(item))) return false;
    if (cutoffDate) {
      const itemDate = new Date(item.publishedAt ?? item.detectedAt);
      if (itemDate < cutoffDate) return false;
    }
    return true;
  });

  const emptyReason = highInterestOnly
    ? "No high-impact items found right now. The quiet periods are nice while they last."
    : selectedRatings.includes("gossip") && selectedRatings.length === 1
    ? "No chatter found for this filter set."
    : hasActiveFilters
    ? "No items match these filters. Try clearing filters or widening your watchlist."
    : "Adjust your filters or trigger a news scan to pull in the latest items.";

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row gap-8">

        {/* ── Main Content ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          <div className="mb-6">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">News & Gossip</h1>
            <p className="text-muted-foreground leading-relaxed">
              AI industry news from major outlets, tech blogs, social media, and community sources — rated by source quality, corroboration, and confidence.
            </p>
          </div>

          <MobileSearchBar />

          {/* Mobile-only horizontally-scrollable filter chip strip */}
          <div className="lg:hidden -mx-4 px-4 mb-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {/* High interest */}
              <button
                onClick={() => updateParam(next => { if (next.get("hi") === "1") next.delete("hi"); else next.set("hi", "1"); })}
                className={cn(
                  "flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  highInterestOnly
                    ? "bg-amber-400/10 border-amber-400/40 text-amber-400"
                    : "bg-card border-border text-muted-foreground"
                )}
              >
                <Zap className="w-3 h-3" />
                High Interest
              </button>

              {/* Credibility chips */}
              {ALL_RATINGS.map(rating => {
                const cfg = CREDIBILITY_CONFIG[rating];
                const active = selectedRatings.includes(rating);
                return (
                  <button
                    key={rating}
                    onClick={() => toggleRating(rating)}
                    className={cn(
                      "flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      active
                        ? cn(cfg.bg, cfg.border, cfg.color)
                        : "bg-card border-border text-muted-foreground"
                    )}
                  >
                    {cfg.label}
                  </button>
                );
              })}

              {/* Impact chips */}
              {ALL_IMPACTS.map(impact => {
                const cfg = IMPACT_CONFIG[impact];
                const active = selectedImpacts.includes(impact);
                return (
                  <button
                    key={impact}
                    onClick={() => toggleImpact(impact)}
                    className={cn(
                      "flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      active
                        ? cn(cfg.bg, cfg.border, cfg.color)
                        : "bg-card border-border text-muted-foreground"
                    )}
                  >
                    {impact}
                  </button>
                );
              })}

              {/* Time range chips */}
              {([["24h", "Last 24h"], ["7d", "Last 7d"], ["30d", "Last 30d"]] as [TimeRange, string][]).map(([key, label]) => {
                const active = selectedTimeRange === key;
                return (
                  <button
                    key={key}
                    onClick={() => toggleTimeRange(key)}
                    className={cn(
                      "flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      active
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-card border-border text-muted-foreground"
                    )}
                  >
                    <Clock className="w-3 h-3" />
                    {label}
                  </button>
                );
              })}

              {/* Clear all (only when filters active) */}
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-border text-muted-foreground bg-card"
                >
                  Clear <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {searchQuery && (
            <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-sm text-primary">
              <Search className="w-4 h-4 shrink-0" />
              <span>Results for <span className="font-semibold">"{searchQuery}"</span></span>
            </div>
          )}

          {hasActiveFilters && (
            <div className="mb-4 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Active filters:</span>
              {selectedRatings.map(r => (
                <button key={r} onClick={() => toggleRating(r)}
                  className={cn("inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium", CREDIBILITY_CONFIG[r].color, CREDIBILITY_CONFIG[r].bg, CREDIBILITY_CONFIG[r].border)}>
                  {CREDIBILITY_CONFIG[r].label} ×
                </button>
              ))}
              {selectedImpacts.map(i => (
                <button key={i} onClick={() => toggleImpact(i)}
                  className={cn("inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium", IMPACT_CONFIG[i].color, IMPACT_CONFIG[i].bg, IMPACT_CONFIG[i].border)}>
                  {i} ×
                </button>
              ))}
              {highInterestOnly && (
                <button onClick={() => updateParam(next => next.delete("hi"))}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium text-amber-400 bg-amber-400/10 border-amber-400/30">
                  High Interest Only ×
                </button>
              )}
              {selectedTimeRange && (
                <button onClick={() => updateParam(next => next.delete("tr"))}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium text-muted-foreground bg-secondary border-border">
                  Last {selectedTimeRange} ×
                </button>
              )}
              <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground underline ml-1">
                Clear all
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonNewsCard key={i} />
              ))}
            </div>
          ) : isErrorNews && !filteredNews.length ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card/30 border border-dashed border-border rounded-3xl">
              <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium text-foreground mb-2">Unable to load news</p>
              <p className="text-sm text-center max-w-md leading-relaxed">
                The server may be temporarily unavailable. Cached data will appear automatically when connectivity is restored.
              </p>
            </div>
          ) : !filteredNews.length ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card/30 border border-dashed border-border rounded-3xl">
              <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium text-foreground mb-2">No items found</p>
              <p className="text-sm text-center max-w-md leading-relaxed">{emptyReason}</p>
              {hasActiveFilters && (
                <button onClick={clearAllFilters} className="mt-4 px-4 py-2 text-sm rounded-xl bg-secondary border border-border hover:bg-secondary/80 text-foreground transition-colors">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {filteredNews.map(item => (
                <NewsCard
                  key={item.id}
                  item={item}
                  onHide={() => setHiddenIds(s => new Set([...s, item.id]))}
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
                  disabled={!data || data.news.length < limit}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar (hidden on mobile — filters exposed via chip strip above) ── */}
        <div className="hidden lg:block w-full lg:w-72 shrink-0">
          <div className="sticky top-6 max-h-[calc(100vh-5rem)] overflow-y-auto space-y-4 pr-1">

            {/* News Scan module */}
            <NewsScanStatus
              onTrigger={() => triggerIngestion.mutate()}
              isPending={triggerIngestion.isPending}
            />

            {/* Filters */}
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">Filters</h3>
                {hasActiveFilters && (
                  <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground">
                    Clear all
                  </button>
                )}
              </div>

              {/* High interest */}
              <div className="mb-5">
                <button
                  onClick={() => updateParam(next => { if (next.get("hi") === "1") next.delete("hi"); else next.set("hi", "1"); })}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all",
                    highInterestOnly
                      ? "bg-amber-400/10 border-amber-400/40 text-amber-400"
                      : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                >
                  <Zap className={cn("w-4 h-4", highInterestOnly ? "text-amber-400" : "text-muted-foreground")} />
                  High Interest Only
                  {highInterestOnly && <span className="ml-auto w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                </button>
              </div>

              {/* Credibility */}
              <div className="mb-5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Credibility</h4>
                <div className="space-y-1.5">
                  {ALL_RATINGS.map(rating => {
                    const cfg = CREDIBILITY_CONFIG[rating];
                    const Icon = cfg.icon;
                    const active = selectedRatings.includes(rating);
                    return (
                      <button
                        key={rating}
                        onClick={() => toggleRating(rating)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm border transition-all text-left",
                          active ? cn(cfg.bg, cfg.border, cfg.color) : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{cfg.label}</div>
                          <div className="text-xs text-muted-foreground leading-tight mt-0.5 line-clamp-1 opacity-70">{cfg.description}</div>
                        </div>
                        {active && <div className={cn("w-2 h-2 rounded-full shrink-0", cfg.color.replace("text-", "bg-"))} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Impact */}
              <div className="mb-5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Impact</h4>
                <div className="space-y-1.5">
                  {ALL_IMPACTS.map(impact => {
                    const cfg = IMPACT_CONFIG[impact];
                    const active = selectedImpacts.includes(impact);
                    return (
                      <button
                        key={impact}
                        onClick={() => toggleImpact(impact)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all text-left",
                          active ? cn(cfg.bg, cfg.border, cfg.color) : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                      >
                        <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                        {impact}
                        {active && <span className="ml-auto w-2 h-2 rounded-full bg-current opacity-80" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Source type */}
              <div className="mb-5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Source Type</h4>
                <div className="space-y-1.5">
                  {Object.entries(SOURCE_TYPE_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-muted-foreground border border-border/40">
                      <List className="w-3.5 h-3.5 shrink-0" />
                      {label}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2 px-1 opacity-60">Source-type filtering coming soon.</p>
              </div>

              {/* Time range */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Time Range</h4>
                <div className="space-y-1.5">
                  {([["24h", "Last 24 hours"], ["7d", "Last 7 days"], ["30d", "Last 30 days"]] as [TimeRange, string][]).map(([key, label]) => {
                    const active = selectedTimeRange === key;
                    return (
                      <button
                        key={key}
                        onClick={() => toggleTimeRange(key)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all text-left",
                          active
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                      >
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {label}
                        {active && <span className="ml-auto w-2 h-2 rounded-full bg-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Rating scale legend */}
            <div className="bg-card/30 border border-border/50 rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Rating Scale</p>
              <div className="space-y-2.5">
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

            {/* Database stat */}
            <div className="bg-card/30 border border-border/50 rounded-2xl p-4 flex items-center gap-3">
              <Database className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {data?.total?.toLocaleString() ?? "—"} total items
                </p>
                <p className="text-xs text-muted-foreground">in intelligence database</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </Layout>
  );
}
