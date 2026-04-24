import { Update } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { ExternalLink, ShieldAlert, Cpu, CheckCircle2, AlertTriangle, Heart } from "lucide-react";
import { cn, getCategoryColor } from "@/lib/utils";
import { useFeedPrefs } from "@/contexts/FeedPrefsContext";
import { useLikes } from "@/contexts/LikesContext";

interface UpdateCardProps {
  update: Update;
}

export function UpdateCard({ update }: UpdateCardProps) {
  const { density } = useFeedPrefs();
  const compact = density === "compact";
  const { isLiked, toggle } = useLikes();
  const liked = isLiked("update", update.id);

  return (
    <div className={cn(
      "group relative flex flex-col bg-card rounded-2xl border border-border transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 hover:border-primary/30",
      compact ? "p-3 md:p-4" : "p-5 md:p-6",
      update.highImpact && "border-l-4 border-l-primary"
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />

      <div className={cn("flex items-start justify-between gap-4", compact ? "mb-2" : "mb-4")}>
        <div className="flex items-center gap-3">
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
          <div>
            <Link href={`/vendors/${update.vendor.slug}`} className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              {update.vendor.name}
            </Link>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", getCategoryColor(update.category.slug))}>
                {update.category.name}
              </span>
              <span className="text-xs text-muted-foreground" title={new Date(update.detectedAt).toLocaleString()}>
                {formatDistanceToNow(new Date(update.detectedAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {update.flaggedForReview && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-yellow-500 bg-yellow-500/10 px-2.5 py-1 rounded-full border border-yellow-500/20 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Flagged</span>
          </div>
        )}
      </div>

      <h3 className={cn(
        "font-display font-bold text-foreground group-hover:text-primary transition-colors leading-snug",
        compact ? "text-base mb-1" : "text-lg md:text-xl mb-2"
      )}>
        {update.title}
      </h3>

      {!compact && update.summary && (
        <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">
          {update.summary}
        </p>
      )}

      {compact && update.summary && (
        <p className="text-xs text-muted-foreground leading-relaxed mb-2 line-clamp-2">
          {update.summary}
        </p>
      )}

      {!compact && update.highImpact && update.whyItMatters && (
        <div className="mt-2 mb-4 p-4 rounded-xl bg-primary/5 border border-primary/10 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/50" />
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Why it matters</span>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">{update.whyItMatters}</p>
        </div>
      )}

      <div className={cn("mt-auto flex items-center justify-between border-t border-border/50", compact ? "pt-2" : "pt-4")}>
        <div className="flex items-center gap-3">
          {update.confidenceScore && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CheckCircle2 className={cn("w-3.5 h-3.5", update.confidenceScore > 0.8 ? "text-green-400" : "text-orange-400")} />
              {Math.round(update.confidenceScore * 100)}% Match
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggle("update", update.id)}
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
          {update.sourceUrl && (
            <a
              href={update.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors bg-secondary px-3 py-1.5 rounded-lg border border-transparent hover:border-primary/20"
            >
              Source
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
