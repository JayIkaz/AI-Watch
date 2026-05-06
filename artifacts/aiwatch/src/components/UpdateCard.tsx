import { Update } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import {
  ExternalLink, Cpu, CheckCircle2, AlertTriangle, Heart,
  ShieldAlert, EyeOff, ThumbsUp, ThumbsDown, Bell, Zap,
  ChevronDown, ChevronUp, Users
} from "lucide-react";
import { cn, getCategoryColor } from "@/lib/utils";
import { useFeedPrefs } from "@/contexts/FeedPrefsContext";
import { useLikes } from "@/contexts/LikesContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface UpdateCardProps {
  update: Update;
  onHide?: () => void;
}

function getCredibilityBadge(update: Update) {
  if (update.flaggedForReview) {
    return { label: "Under review", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" };
  }
  const s = update.confidenceScore ?? 0;
  if (s >= 0.9)  return { label: "Official update",   color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" };
  if (s >= 0.75) return { label: "Confirmed",          color: "text-blue-400 bg-blue-400/10 border-blue-400/20" };
  if (s >= 0.55) return { label: "Credible report",    color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" };
  if (s > 0)     return { label: "Industry rumour",    color: "text-orange-400 bg-orange-400/10 border-orange-400/20" };
  return           { label: "Unconfirmed",             color: "text-muted-foreground bg-muted/30 border-border" };
}

function getImpact(update: Update): { label: string; color: string } {
  if (update.highImpact) return { label: "High impact", color: "text-primary bg-primary/10 border-primary/30" };
  const s = update.confidenceScore ?? 0;
  if (s >= 0.6)  return { label: "Medium impact", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" };
  return           { label: "Low impact",    color: "text-muted-foreground bg-muted/20 border-border" };
}

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

function getAudience(slug: string): string[] {
  const map: Record<string, string[]> = {
    "pricing":       ["Enterprise buyers", "Founders"],
    "model-release": ["Developers", "Product teams"],
    "api-changelog": ["Developers"],
    "safety":        ["Product teams", "Enterprise buyers"],
    "research":      ["Analysts", "Founders"],
    "product":       ["Product teams", "Developers"],
  };
  return map[slug] || ["Developers"];
}

export function UpdateCard({ update, onHide }: UpdateCardProps) {
  const { density } = useFeedPrefs();
  const compact = density === "compact";
  const { isLiked, toggle } = useLikes();
  const liked = isLiked("update", update.id);
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);

  const credibility = getCredibilityBadge(update);
  const impact = getImpact(update);
  const action = getRecommendedAction(update.category.slug);
  const audience = getAudience(update.category.slug);

  const whyItMatters = update.whyItMatters
    || update.summary
    || `This update from ${update.vendor.name} may affect your ${update.category.name.toLowerCase()} workflows.`;

  return (
    <div className={cn(
      "group relative flex flex-col bg-card rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5",
      compact ? "p-3 md:p-4" : "p-5 md:p-6",
      update.highImpact
        ? "border-l-[3px] border-l-primary border-t border-r border-b border-primary/25 hover:border-primary/40 shadow-[0_0_0_1px_rgba(0,240,255,0.06)]"
        : "border-border hover:border-primary/30"
    )}>
      {update.highImpact && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.04] via-transparent to-transparent rounded-2xl pointer-events-none" />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />

      {/* Top row: vendor + meta + badges */}
      <div className={cn("flex items-start justify-between gap-3", compact ? "mb-2" : "mb-3")}>
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/vendors/${update.vendor.slug}`} className="relative block shrink-0">
            <div className={cn(
              "rounded-xl bg-secondary border border-border flex items-center justify-center overflow-hidden hover:border-primary/50 transition-colors",
              compact ? "w-8 h-8" : "w-10 h-10"
            )}>
              {update.vendor.logoUrl ? (
                <img src={update.vendor.logoUrl} alt={update.vendor.name} className="w-full h-full object-cover" />
              ) : (
                <Cpu className={cn(compact ? "w-4 h-4" : "w-5 h-5", "text-muted-foreground")} />
              )}
            </div>
          </Link>
          <div className="min-w-0">
            <Link href={`/vendors/${update.vendor.slug}`} className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              {update.vendor.name}
            </Link>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium shrink-0", getCategoryColor(update.category.slug))}>
                {update.category.name}
              </span>
              <span className="text-xs text-muted-foreground shrink-0" title={new Date(update.detectedAt).toLocaleString()}>
                {formatDistanceToNow(new Date(update.detectedAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {update.highImpact && (
            <div className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              <Zap className="w-3 h-3" />
              High impact
            </div>
          )}
          <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", credibility.color)}>
            {credibility.label}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className={cn(
        "font-display font-bold text-foreground group-hover:text-primary transition-colors leading-snug",
        compact ? "text-base mb-2" : "text-lg md:text-xl mb-2"
      )}>
        {update.title}
      </h3>

      {/* Summary */}
      {update.summary && (
        <p className={cn(
          "text-muted-foreground leading-relaxed",
          compact ? "text-xs mb-2 line-clamp-2" : "text-sm mb-3 line-clamp-2"
        )}>
          {update.summary}
        </p>
      )}

      {/* Why it matters */}
      {!compact && (
        <div className={cn(
          "mb-3 p-3 rounded-xl relative overflow-hidden",
          update.highImpact
            ? "bg-primary/5 border border-primary/15"
            : "bg-muted/20 border border-border/60"
        )}>
          {update.highImpact && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/60" />}
          <div className="flex items-center gap-1.5 mb-1">
            <ShieldAlert className={cn("w-3.5 h-3.5 shrink-0", update.highImpact ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("text-xs font-bold uppercase tracking-wider", update.highImpact ? "text-primary" : "text-muted-foreground")}>
              Why it matters
            </span>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">{whyItMatters}</p>
        </div>
      )}

      {/* Expanded details */}
      {!compact && expanded && (
        <div className="mb-3 space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">Who should care:</span>
            <div className="flex gap-1.5 flex-wrap">
              {audience.map(a => (
                <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                  {a}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Recommended action:</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-foreground font-medium">
              {action}
            </span>
          </div>
          {update.confidenceScore != null && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Source confidence:</span>
              <div className="flex items-center gap-1">
                <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", update.confidenceScore > 0.7 ? "bg-emerald-400" : update.confidenceScore > 0.5 ? "bg-amber-400" : "bg-muted-foreground")}
                    style={{ width: `${Math.round(update.confidenceScore * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{Math.round(update.confidenceScore * 100)}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom row */}
      <div className={cn("mt-auto flex items-center justify-between border-t border-border/40", compact ? "pt-2" : "pt-3")}>
        <div className="flex items-center gap-3">
          {/* Impact badge (only when not high-impact, to avoid repeat) */}
          {!update.highImpact && !compact && (
            <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", impact.color)}>
              {impact.label}
            </span>
          )}
          {/* Relevance score */}
          {update.confidenceScore != null && (
            <div
              className="flex items-center gap-1 text-xs text-muted-foreground"
              title="Based on vendor, category, keywords, and content analysis."
            >
              <CheckCircle2 className={cn("w-3.5 h-3.5", update.confidenceScore > 0.8 ? "text-emerald-400" : "text-amber-400")} />
              Relevance: {Math.round(update.confidenceScore * 100)}%
            </div>
          )}
          {update.flaggedForReview && (
            <div className="flex items-center gap-1 text-xs font-medium text-yellow-500">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Flagged</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {/* Expand / collapse */}
          {!compact && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
              title={expanded ? "Show less" : "Show more details"}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}

          {/* Save */}
          <button
            onClick={() => toggle("update", update.id)}
            className={cn(
              "p-2.5 rounded-lg transition-all duration-200",
              liked
                ? "text-rose-400 hover:text-rose-300"
                : "text-muted-foreground hover:text-rose-400 hover:bg-rose-400/10"
            )}
            title={liked ? "Remove from Saved" : "Save"}
          >
            <Heart className={cn("w-4 h-4 transition-transform", liked && "fill-current scale-110")} />
          </button>

          {/* Hide */}
          {onHide && (
            <button
              onClick={onHide}
              className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
              title="Hide this update"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          )}

          {/* More like this */}
          <button
            onClick={() => toast({ title: "Preference noted", description: "You'll see more updates like this." })}
            className="p-2.5 rounded-lg text-muted-foreground hover:text-emerald-400 hover:bg-emerald-400/10 transition-all"
            title="More like this"
          >
            <ThumbsUp className="w-4 h-4" />
          </button>

          {/* Less like this */}
          <button
            onClick={() => toast({ title: "Preference noted", description: "You'll see fewer updates like this." })}
            className="p-2.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-400/10 transition-all"
            title="Less like this"
          >
            <ThumbsDown className="w-4 h-4" />
          </button>

          {/* Create alert */}
          <button
            onClick={() => toast({ title: "Alert created", description: `You'll be notified about similar ${update.category.name} updates from ${update.vendor.name}.` })}
            className="p-2.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
            title="Create alert"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* Source */}
          {update.sourceUrl && (
            <a
              href={update.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors bg-secondary px-2.5 py-1.5 rounded-lg border border-transparent hover:border-primary/20 ml-0.5"
            >
              Source <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
