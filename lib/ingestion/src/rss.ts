import * as RssParserModule from "rss-parser";

// rss-parser is a CJS `export =` module, and its ambient construct-signature
// typing resolves inconsistently across build environments (works locally,
// fails under Vercel's build). Sidestep it entirely: construct via `any` and
// type the surface we actually use ourselves.
interface RssParserItem {
  title?: string;
  link?: string;
  contentSnippet?: string;
  content?: string;
  summary?: string;
  isoDate?: string;
  pubDate?: string;
}

interface RssParserInstance {
  parseURL(url: string): Promise<{ items?: RssParserItem[] }>;
}

const RssParserCtor: new (options?: unknown) => RssParserInstance =
  (RssParserModule as any).default ?? (RssParserModule as any);

export interface FeedItem {
  title: string;
  content: string;
  sourceUrl: string;
  publishedAt: Date | null;
}

const parser = new RssParserCtor({
  timeout: 30000,
  headers: { "User-Agent": "AIWatch/1.0 RSS Reader" },
});

export async function fetchFeedItems(url: string, opts?: { maxItems?: number }): Promise<FeedItem[]> {
  const maxItems = opts?.maxItems ?? 20;
  const feed = await parser.parseURL(url);

  const items: FeedItem[] = [];
  for (const item of feed.items ?? []) {
    const title = (item.title ?? "").trim();
    const sourceUrl = (item.link ?? "").trim();
    if (!title || !sourceUrl) continue;

    const content = (item.contentSnippet ?? item.content ?? item.summary ?? "").trim();
    const rawDate = item.isoDate ?? item.pubDate;
    const parsedDate = rawDate ? new Date(rawDate) : null;
    const publishedAt = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

    items.push({ title, content, sourceUrl, publishedAt });
    if (items.length >= maxItems) break;
  }

  return items;
}
