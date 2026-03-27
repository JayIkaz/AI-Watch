import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  Bell,
  X,
  Zap,
  CheckCircle,
  AlertTriangle,
  Newspaper,
  ArrowRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  useListUpdates,
  useListNews,
  useGetIngestionStatus,
  useGetNewsStatus,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const LS_KEY = "aiwatch_last_notification_view";

function getLastViewedAt(): string | null {
  try {
    return localStorage.getItem(LS_KEY);
  } catch {
    return null;
  }
}

function markViewed() {
  try {
    localStorage.setItem(LS_KEY, new Date().toISOString());
  } catch {}
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [lastViewedAt] = useState<string | null>(getLastViewedAt);
  const panelRef = useRef<HTMLDivElement>(null);

  // High-impact updates since last viewed
  const { data: updatesData, isLoading: updatesLoading } = useListUpdates(
    {
      highImpact: true,
      date_from: lastViewedAt ?? undefined,
      limit: 5,
    },
    { query: { refetchInterval: 30000 } }
  );

  // High-interest news (client-side date filter)
  const { data: newsData, isLoading: newsLoading } = useListNews(
    { highInterest: true, limit: 10 },
    { query: { refetchInterval: 30000 } }
  );

  const { data: ingestionStatus } = useGetIngestionStatus({
    query: { refetchInterval: 10000 },
  });

  const { data: newsStatus } = useGetNewsStatus({
    query: { refetchInterval: 10000 },
  });

  const newUpdates = updatesData?.updates ?? [];

  const newNewsItems = (newsData?.news ?? []).filter((item) => {
    if (!lastViewedAt) return true;
    const itemDate = item.publishedAt ?? item.detectedAt;
    return itemDate ? new Date(itemDate) > new Date(lastViewedAt) : false;
  });

  const totalCount = newUpdates.length + newNewsItems.length;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function toggle() {
    if (!open) markViewed();
    setOpen((v) => !v);
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={toggle}
        className={cn(
          "relative p-2 rounded-full transition-all duration-200",
          open
            ? "text-primary bg-primary/10"
            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
        )}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {totalCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[8px] h-2 bg-primary rounded-full shadow-[0_0_10px_rgba(0,240,255,0.8)]" />
        )}
        {totalCount === 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-muted-foreground/30 rounded-full" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-[380px] max-h-[80vh] overflow-y-auto rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/40 z-50"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-border bg-card/80 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground text-sm">Notifications</span>
                {totalCount > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
                    {totalCount} new
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-border/50">
              {/* Scan Status section */}
              <ScanStatusSection
                ingestionStatus={ingestionStatus}
                newsStatus={newsStatus}
              />

              {/* High-impact updates */}
              <Section
                icon={<Zap className="w-4 h-4 text-amber-400" />}
                title="High-Impact Updates"
                emptyText={lastViewedAt ? "No new high-impact updates since your last visit." : "No high-impact updates yet."}
                loading={updatesLoading}
                count={newUpdates.length}
                viewAllHref="/?highImpact=true"
                viewAllLabel="View all high-impact"
              >
                {newUpdates.map((u) => (
                  <NotifItem
                    key={u.id}
                    dot="amber"
                    title={u.title}
                    meta={[
                      u.vendorName,
                      u.categoryName,
                      u.publishedAt
                        ? formatDistanceToNow(new Date(u.publishedAt), { addSuffix: true })
                        : undefined,
                    ].filter(Boolean).join(" · ")}
                    href="/"
                  />
                ))}
              </Section>

              {/* High-interest news */}
              <Section
                icon={<Newspaper className="w-4 h-4 text-blue-400" />}
                title="High-Interest News"
                emptyText={lastViewedAt ? "No new high-interest news since your last visit." : "No high-interest news yet."}
                loading={newsLoading}
                count={newNewsItems.length}
                viewAllHref="/news?highInterest=true"
                viewAllLabel="View all in News & Gossip"
              >
                {newNewsItems.map((item) => (
                  <NotifItem
                    key={item.id}
                    dot="blue"
                    title={item.title}
                    meta={[
                      item.sourceName,
                      item.publishedAt
                        ? formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true })
                        : item.detectedAt
                          ? formatDistanceToNow(new Date(item.detectedAt), { addSuffix: true })
                          : undefined,
                    ].filter(Boolean).join(" · ")}
                    href="/news"
                  />
                ))}
              </Section>
            </div>

            {totalCount === 0 && !updatesLoading && !newsLoading && (
              <div className="px-5 pb-6 pt-2 text-center text-muted-foreground text-sm">
                You're all caught up.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ScanStatusSection({
  ingestionStatus,
  newsStatus,
}: {
  ingestionStatus?: { isRunning: boolean; lastRunAt: string | null; totalItems: number };
  newsStatus?: { isRunning: boolean; lastRunAt: string | null; totalItems: number };
}) {
  if (!ingestionStatus && !newsStatus) return null;

  return (
    <div className="px-5 py-4 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Pipeline Status
      </p>
      {ingestionStatus && (
        <StatusRow
          label="Vendor ingestion"
          isRunning={ingestionStatus.isRunning}
          lastRunAt={ingestionStatus.lastRunAt}
          totalItems={ingestionStatus.totalItems}
          itemLabel="updates"
        />
      )}
      {newsStatus && (
        <StatusRow
          label="News scan"
          isRunning={newsStatus.isRunning}
          lastRunAt={newsStatus.lastRunAt}
          totalItems={newsStatus.totalItems}
          itemLabel="news items"
        />
      )}
    </div>
  );
}

function StatusRow({
  label,
  isRunning,
  lastRunAt,
  totalItems,
  itemLabel,
}: {
  label: string;
  isRunning: boolean;
  lastRunAt: string | null;
  totalItems: number;
  itemLabel: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-background/50 border border-border/50 px-3 py-2.5 text-xs">
      <div className="flex items-center gap-2">
        {isRunning ? (
          <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
        ) : (
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        )}
        <span className="text-foreground font-medium">{label}</span>
      </div>
      <div className="text-right text-muted-foreground">
        {isRunning ? (
          <span className="text-primary">Running…</span>
        ) : lastRunAt ? (
          <span>{formatDistanceToNow(new Date(lastRunAt), { addSuffix: true })}</span>
        ) : (
          <span>Never run</span>
        )}
        <span className="ml-2 text-muted-foreground/50">· {totalItems} {itemLabel}</span>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  emptyText,
  loading,
  count,
  viewAllHref,
  viewAllLabel,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  emptyText: string;
  loading: boolean;
  count: number;
  viewAllHref: string;
  viewAllLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          {count > 0 && (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
              {count}
            </span>
          )}
        </div>
        <Link
          href={viewAllHref}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          {viewAllLabel} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : count === 0 ? (
        <p className="text-xs text-muted-foreground/70 text-center py-3">{emptyText}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  );
}

function NotifItem({
  dot,
  title,
  meta,
  href,
}: {
  dot: "amber" | "blue" | "emerald" | "rose";
  title: string;
  meta: string;
  href: string;
}) {
  const dotColors = {
    amber: "bg-amber-400 shadow-[0_0_6px_theme(colors.amber.400)]",
    blue: "bg-blue-400 shadow-[0_0_6px_theme(colors.blue.400)]",
    emerald: "bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]",
    rose: "bg-rose-400 shadow-[0_0_6px_theme(colors.rose.400)]",
  };

  return (
    <Link
      href={href}
      className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer"
    >
      <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", dotColors[dot])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{meta}</p>
      </div>
    </Link>
  );
}
