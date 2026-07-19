import { useState } from "react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import {
  Bell,
  CheckCircle2,
  ExternalLink,
  Heart,
  ShieldAlert,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  JURISDICTION_CONFIG,
  REGULATION_TYPE_CONFIG,
  URGENCY_CONFIG,
  vendorLabelFromSlug,
  type RegulationItem,
} from "@/data/regulations";

interface RegulationCardProps {
  item: RegulationItem;
  vendorNames?: Map<string, string>;
}

export function RegulationCard({ item, vendorNames }: RegulationCardProps) {
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);

  const typeCfg = REGULATION_TYPE_CONFIG[item.regulationType];
  const urgencyCfg = URGENCY_CONFIG[item.urgency];
  const jurisdictionCfg = JURISDICTION_CONFIG[item.jurisdiction];
  const TypeIcon = typeCfg.icon;
  const UrgencyIcon = urgencyCfg.icon;

  const isDeadline = item.urgency === "deadline_approaching";
  const urgencyLabel =
    isDeadline && item.deadlineDate
      ? `Deadline: ${format(parseISO(item.deadlineDate), "d MMM yyyy")}`
      : urgencyCfg.label;

  const jurisdictionLabel = item.jurisdictionDetail
    ? `${jurisdictionCfg.label} · ${item.jurisdictionDetail}`
    : jurisdictionCfg.label;

  return (
    <div className={cn(
      "group relative flex flex-col bg-card rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 p-5 md:p-6",
      isDeadline
        ? "border-l-[3px] border-l-raspberry border-t border-r border-b border-raspberry/25 hover:border-raspberry/40 shadow-[0_0_0_1px_hsl(var(--raspberry)/0.06)]"
        : "border-border hover:border-primary/30"
    )}>
      {isDeadline && (
        <div className="absolute inset-0 bg-gradient-to-r from-raspberry/[0.04] via-transparent to-transparent rounded-2xl pointer-events-none" />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />

      {/* Top row: type icon + jurisdiction + meta + badges */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0">
            <TypeIcon className={cn("w-5 h-5", typeCfg.color)} />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-semibold text-muted-foreground">
              {jurisdictionLabel}
            </span>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium shrink-0", typeCfg.color, typeCfg.bg, typeCfg.border)}>
                {typeCfg.label}
              </span>
              <span className="text-xs text-muted-foreground shrink-0" title={new Date(item.detectedAt).toLocaleString()}>
                {formatDistanceToNow(parseISO(item.detectedAt), { addSuffix: true })}
              </span>
              <span
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70 bg-muted/30 border border-border/50 px-1.5 py-0.5 rounded-full shrink-0"
                title={`Status last verified ${new Date(item.lastVerified).toLocaleString()}`}
              >
                <ShieldCheck className="w-3 h-3" />
                Verified {formatDistanceToNow(parseISO(item.lastVerified), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-semibold", urgencyCfg.color, urgencyCfg.bg, urgencyCfg.border)}>
            <UrgencyIcon className="w-3 h-3" />
            {urgencyLabel}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-sky bg-sky/10 border-sky/20">
            Confirmed
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-display font-bold text-foreground group-hover:text-primary transition-colors leading-snug text-lg md:text-xl mb-2">
        {item.title}
      </h3>

      {/* Summary */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-3">
        {item.summary}
      </p>

      {/* Why it matters */}
      <div className={cn(
        "mb-3 p-3 rounded-xl relative overflow-hidden",
        isDeadline
          ? "bg-raspberry/5 border border-raspberry/15"
          : "bg-muted/20 border border-border/60"
      )}>
        {isDeadline && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-raspberry/60" />}
        <div className="flex items-center gap-1.5 mb-1">
          <ShieldAlert className={cn("w-3.5 h-3.5 shrink-0", isDeadline ? "text-raspberry" : "text-muted-foreground")} />
          <span className={cn("text-xs font-bold uppercase tracking-wider", isDeadline ? "text-raspberry" : "text-muted-foreground")}>
            Why it matters
          </span>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">{item.whyItMatters}</p>
      </div>

      {/* Affected vendors */}
      {item.affectedVendors.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">Affects:</span>
          {item.affectedVendors.map(slug => (
            <span key={slug} className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
              {vendorNames?.get(slug) ?? vendorLabelFromSlug(slug)}
            </span>
          ))}
        </div>
      )}

      {/* Bottom row */}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-y-1 border-t border-border/40 pt-3">
        <div
          className="flex items-center gap-1 text-xs text-muted-foreground"
          title="Based on jurisdiction scope, affected vendors, and compliance impact."
        >
          <CheckCircle2 className={cn("w-3.5 h-3.5", item.relevance > 0.8 ? "text-teal" : "text-amber")} />
          Relevance: {Math.round(item.relevance * 100)}%
        </div>

        <div className="flex flex-wrap items-center justify-end gap-0.5 ml-auto min-w-0">
          {/* Save */}
          <button
            onClick={() => {
              setSaved(v => !v);
              toast({ title: saved ? "Removed from saved" : "Saved", description: saved ? "Item removed from your saved list." : "Regulation item saved for later." });
            }}
            className={cn(
              "h-10 w-10 flex items-center justify-center rounded-lg transition-all duration-200",
              saved
                ? "text-raspberry hover:text-raspberry/80"
                : "text-muted-foreground hover:text-raspberry hover:bg-raspberry/10"
            )}
            title={saved ? "Remove from Saved" : "Save"}
          >
            <Heart className={cn("w-4 h-4 transition-transform", saved && "fill-current scale-110")} />
          </button>

          {/* More like this */}
          <button
            onClick={() => toast({ title: "Preference noted", description: "You'll see more regulatory items like this." })}
            className="h-10 w-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-teal hover:bg-teal/10 transition-all"
            title="More like this"
          >
            <ThumbsUp className="w-4 h-4" />
          </button>

          {/* Less like this */}
          <button
            onClick={() => toast({ title: "Preference noted", description: "You'll see fewer regulatory items like this." })}
            className="h-10 w-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-raspberry hover:bg-raspberry/10 transition-all"
            title="Less like this"
          >
            <ThumbsDown className="w-4 h-4" />
          </button>

          {/* Create alert */}
          <button
            onClick={() => toast({ title: "Alert created", description: `You'll be notified about ${jurisdictionCfg.label} regulatory changes.` })}
            className="h-10 w-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
            title="Create alert"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* Source */}
          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors bg-secondary px-2.5 py-1.5 rounded-lg border border-transparent hover:border-primary/20 ml-0.5"
              title={item.sourceName}
            >
              <span className="max-w-[8rem] truncate">{item.sourceName ?? "Source"}</span> <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
