import { useMemo } from "react";
import { motion } from "framer-motion";
import { useListUpdates, useListNews } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

type TickerItem = {
  id: string;
  kind: "feed" | "news";
  label: string;
  title: string;
  url?: string | null;
  at: number;
  hot: boolean;
};

const PER_SOURCE = 10;
const SECONDS_PER_ITEM = 7;
const MIN_DURATION = 45;

function decodeHtml(s: string): string {
  if (typeof document === "undefined") return s;
  const el = document.createElement("textarea");
  el.innerHTML = s;
  return el.value;
}

function toTime(...dates: Array<string | Date | null | undefined>): number {
  for (const d of dates) {
    if (d) {
      const t = new Date(d).getTime();
      if (!Number.isNaN(t)) return t;
    }
  }
  return 0;
}

function TickerList({ items, hidden }: { items: TickerItem[]; hidden?: boolean }) {
  return (
    <ul
      className={cn("ticker-list flex shrink-0 items-center", hidden && "ticker-dup")}
      aria-hidden={hidden || undefined}
    >
      {items.map(item => {
        const content = (
          <>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                item.kind === "feed" ? "bg-violet-tint text-violet" : "bg-sky-tint text-sky",
              )}
            >
              {item.kind === "feed" ? "Feed" : "News"}
            </span>
            <span className="shrink-0 text-xs font-semibold text-foreground">{item.label}</span>
            {item.hot && (
              <span className="shrink-0 rounded-full bg-amber-tint px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber">
                Hot
              </span>
            )}
            <span className="text-xs text-muted-foreground">{item.title}</span>
          </>
        );
        return (
          <li key={item.id} className="flex items-center">
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={hidden ? -1 : undefined}
                className="flex items-center gap-2 px-4 hover:[&_span:last-child]:text-foreground focus-visible:outline-none focus-visible:underline"
              >
                {content}
              </a>
            ) : (
              <span className="flex items-center gap-2 px-4">{content}</span>
            )}
            <span aria-hidden className="text-border">◆</span>
          </li>
        );
      })}
    </ul>
  );
}

export function NewsTicker({ className }: { className?: string }) {
  const { data: updatesData, isLoading: loadingUpdates } = useListUpdates(
    { limit: PER_SOURCE },
    {
      query: {
        queryKey: ["/api/v1/updates", "ticker", PER_SOURCE],
        staleTime: 2 * 60 * 1000,
        refetchInterval: 2 * 60 * 1000,
      },
    },
  );
  const { data: newsData, isLoading: loadingNews } = useListNews(
    { limit: PER_SOURCE },
    {
      query: {
        queryKey: ["/api/v1/news", "ticker", PER_SOURCE],
        staleTime: 2 * 60 * 1000,
        refetchInterval: 2 * 60 * 1000,
      },
    },
  );

  const items = useMemo<TickerItem[]>(() => {
    const feed: TickerItem[] = (updatesData?.updates ?? []).map(u => ({
      id: `u-${u.id}`,
      kind: "feed",
      label: u.vendor?.name ?? "Update",
      title: decodeHtml(u.title),
      url: u.sourceUrl,
      at: toTime(u.publishedAt, u.detectedAt),
      hot: !!u.highImpact,
    }));
    const news: TickerItem[] = (newsData?.news ?? []).map(n => ({
      id: `n-${n.id}`,
      kind: "news",
      label: n.sourceName,
      title: decodeHtml(n.title),
      url: n.sourceUrl,
      at: toTime(n.publishedAt, n.detectedAt),
      hot: !!n.highInterest,
    }));
    feed.sort((a, b) => b.at - a.at);
    news.sort((a, b) => b.at - a.at);

    // Round-robin so both sources show up, each still newest-first.
    const merged: TickerItem[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < Math.max(feed.length, news.length); i++) {
      for (const item of [feed[i], news[i]]) {
        if (!item) continue;
        const key = item.title.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
      }
    }
    return merged;
  }, [updatesData, newsData]);

  const isLoading = (loadingUpdates || loadingNews) && items.length === 0;
  const duration = Math.max(MIN_DURATION, items.length * SECONDS_PER_ITEM);

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "ticker flex h-8 w-full min-w-0 items-center overflow-hidden rounded-full border border-border bg-card/60",
        className,
      )}
      role="region"
      aria-label="Latest news ticker"
    >
      <div className="flex h-full shrink-0 items-center gap-2 border-r border-border bg-raspberry-tint pl-3 pr-3">
        <span className="relative flex h-2 w-2">
          <span className="ticker-ping absolute inline-flex h-full w-full rounded-full bg-raspberry opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-raspberry" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-raspberry">Live</span>
      </div>

      <div className="ticker-viewport relative h-full min-w-0 flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center px-4">
            <div className="h-2 w-2/3 animate-pulse rounded-full bg-muted" />
          </div>
        ) : items.length === 0 ? null : (
          <div
            className="ticker-track flex h-full w-max items-center"
            style={{ ["--ticker-duration" as string]: `${duration}s` }}
          >
            <TickerList items={items} />
            <TickerList items={items} hidden />
          </div>
        )}
      </div>
    </motion.div>
  );
}
