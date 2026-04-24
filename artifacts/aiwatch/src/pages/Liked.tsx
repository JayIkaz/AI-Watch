import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { useLikes, LIKED_ITEMS_QK } from "@/contexts/LikesContext";
import { UpdateCard } from "@/components/UpdateCard";
import type { LikedItems, LikedNews, Update } from "@workspace/api-client-react";
import { Heart, Loader2, Newspaper, Activity, ExternalLink, Building2, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

type Tab = "updates" | "news";

function LikedNewsCard({ item }: { item: LikedNews }) {
  const { isLiked, toggle } = useLikes();
  const liked = isLiked("news", item.id);

  return (
    <div className="group relative flex flex-col bg-card rounded-2xl border border-border p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          {item.highInterest && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border bg-amber-400/10 border-amber-400/30 text-amber-400">
              <Zap className="w-3 h-3" />
              High Interest
            </span>
          )}
          <span className="text-xs px-2.5 py-1 rounded-full border bg-secondary border-border text-muted-foreground font-medium capitalize">
            {item.credibilityRating}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">
            {item.publishedAt
              ? formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true })
              : formatDistanceToNow(new Date(item.detectedAt), { addSuffix: true })}
          </span>
          <button
            onClick={() => toggle("news", item.id)}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              liked ? "text-rose-400 hover:text-rose-300" : "text-muted-foreground hover:text-rose-400"
            )}
            title={liked ? "Unlike" : "Like"}
          >
            <Heart className={cn("w-4 h-4", liked && "fill-current")} />
          </button>
        </div>
      </div>

      <h3 className="text-base font-display font-bold text-foreground mb-2 leading-snug group-hover:text-primary transition-colors">
        {item.title}
      </h3>

      {item.summary && (
        <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-3">
          {item.summary}
        </p>
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

export default function Liked() {
  const [tab, setTab] = useState<Tab>("updates");

  const { data, isLoading } = useQuery<LikedItems>({
    queryKey: LIKED_ITEMS_QK,
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/v1/likes/items", { signal, credentials: "include" });
      if (!res.ok) throw new Error("Failed to load liked items");
      return res.json();
    },
    staleTime: 10000,
  });

  const updates = data?.updates ?? [];
  const news = data?.news ?? [];
  const total = updates.length + news.length;

  return (
    <Layout>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Heart className="w-6 h-6 text-rose-400 fill-rose-400" />
          <h1 className="text-3xl font-display font-bold text-foreground">Saved</h1>
          {total > 0 && (
            <span className="text-sm font-semibold px-2.5 py-1 rounded-full bg-rose-400/10 border border-rose-400/20 text-rose-400">
              {total}
            </span>
          )}
        </div>
        <p className="text-muted-foreground">Stories and updates you've liked, saved for later.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-8 p-1 bg-card/50 border border-border rounded-2xl w-fit">
        {(["updates", "news"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
              tab === t
                ? "bg-background text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "updates" ? <Activity className="w-4 h-4" /> : <Newspaper className="w-4 h-4" />}
            {t === "updates" ? "Intelligence Updates" : "News & Gossip"}
            {!isLoading && (
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full font-semibold",
                tab === t ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
              )}>
                {t === "updates" ? updates.length : news.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground bg-card/20 border border-dashed border-border rounded-3xl">
          <Heart className="w-14 h-14 mb-5 opacity-10" />
          <p className="text-xl font-semibold text-foreground mb-2">Nothing saved yet</p>
          <p className="text-sm text-center max-w-sm mb-6">
            Hit the heart icon on any update or news story to save it here for later.
          </p>
          <div className="flex gap-3">
            <Link href="/" className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              Browse Intelligence Feed
            </Link>
            <Link href="/news" className="px-4 py-2 rounded-xl bg-secondary border border-border text-sm font-medium hover:bg-secondary/80 transition-colors text-foreground">
              Browse News
            </Link>
          </div>
        </div>
      ) : tab === "updates" ? (
        updates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card/20 border border-dashed border-border rounded-3xl">
            <Activity className="w-10 h-10 mb-4 opacity-20" />
            <p className="text-base font-medium text-foreground mb-1">No saved updates</p>
            <p className="text-sm">Like updates from the <Link href="/" className="text-primary hover:underline">Intelligence Feed</Link> to see them here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {updates.map(u => (
              <UpdateCard key={u.id} update={u as unknown as Update} />
            ))}
          </div>
        )
      ) : (
        news.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card/20 border border-dashed border-border rounded-3xl">
            <Newspaper className="w-10 h-10 mb-4 opacity-20" />
            <p className="text-base font-medium text-foreground mb-1">No saved news</p>
            <p className="text-sm">Like news stories from the <Link href="/news" className="text-primary hover:underline">News & Gossip</Link> page to see them here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {news.map(item => (
              <LikedNewsCard key={item.id} item={item} />
            ))}
          </div>
        )
      )}
    </Layout>
  );
}
